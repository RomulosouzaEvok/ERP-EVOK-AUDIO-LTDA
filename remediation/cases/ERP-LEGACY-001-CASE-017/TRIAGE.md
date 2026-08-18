# CASE-017: POST /api/items com saldo sem movimento — TRIAGEM

**Encontrado:** `AUD-T01-01` (HIGH / HIGH_CONFIDENCE / PROPOSED)  
**Auditado em:** AUDIT_COMMIT `c1311a6f76b512fef893f7e60d934179cae3409f` (T-01 TIER1_CADASTRO)  
**Triagem iniciada:** 2026-08-18  
**Estado:** TRIAGE — causa-raiz confirmada; blast radius mapeado; decisão de comportamento pendente.

## 1. VERIFICAÇÃO ESTÁTICA — Código ainda reflete o finding?

### 1.1 Aceita estoque_atual na criação?

**CONFIRMADO: SIM**

- `server/src/modules/items/presentation/validators/itemValidators.ts:14` — `createItemSchema` **aceita** `estoque_atual: z.coerce.number().min(0).optional()`.
- `server/src/modules/items/application/use-cases/CreateItemUseCase.ts:41` — **grava** `estoque_atual: input.estoque_atual ?? 0` no banco.

### 1.2 Flui para products.quantity?

**CONFIRMADO: SIM — sem movimento de estoque**

- `server/src/services/itemProductMirrorService.ts:106` — ao criar produto gêmeo, **atribui** `quantity: item.estoque_atual ?? 0`.
- `server/src/modules/items/infrastructure/sequelize/SequelizeItemRepository.ts:92` — MRP lê `const physicalQuantity = liveProduct?.quantity ?? item.estoque_atual;` (linhas 90-106).
- **Nenhuma entrada em `inventory_movements`** — o valor aparece em `products.quantity` diretamente, sem registro transacional.

### 1.3 Há log de auditoria?

**CONFIRMADO: NÃO**

- Grep em `server/src/modules/items` por `auditLogService`, `logAction`, `audit_logs` → **zero matches**.
- Conforme `AUD-T01-02` (HIGH): os 12 endpoints de escrita do tier 1 não têm trilha.
- Incidente medido: 327 itens reais carregados, `audit_logs` com apenas 2 linhas (`audit-coverage-guard.test.ts:5-12`).

### 1.4 A atualização (UPDATE) bloqueia saldo?

**CONFIRMADO: SIM — atualização é deliberadamente restritiva**

- `server/src/modules/items/presentation/validators/itemValidators.ts:37-53` — `updateItemSchema` **NÃO inclui** `estoque_atual`, `estoque_reservado`.
- `server/src/services/itemProductMirrorService.ts:162-169` — ao atualizar item, o mirror **ignora** `quantity` e `reserved_quantity`; apenas propaga `name`, `product_type`, `cost_price`, `unit`, `lead_time`, `status`.
- **Assincronia intencional:** CREATE aceita; UPDATE rejeita → evidência de que a invariante existe no design, mas não é imposta uniformemente.

## 2. CAUSA-RAIZ CONFIRMADA

**Raiz:** validação de `estoque_atual` é **assimétrica**: aceitável na criação (`createItemSchema:14`), bloqueada na atualização (`updateItemSchema:37-53`).

**Por que isto é um defeito:**

1. **Saldo sem movimento** — o valor gravado em `estoque_atual` (item) e propagado para `products.quantity` (MRP) não corresponde a nenhuma entrada em `inventory_movements`. É saldo "do ar", não contabilizado.

2. **Quebra de rastreabilidade** — a trilha de estoque legítimo passa por `inventory_movements`, que registra tipo (entrada/saída), razão, quantidade e data. Saldo inicial sem movimento é **inauditável**: não há resposta para "como esse saldo chegou lá?".

3. **MRP consome diretamente** — `SequelizeItemRepository.listMrpInventoryPositions:92` lê `products.quantity` como saldo físico disponível. Saldo inicial fictício → MRP que não coloca pedido quando deveria, ou coloca quando não deveria.

4. **Assincronia entre create/update flagra o defeito** — se a intenção fosse permitir saldo inicial, o UPDATE também aceitaria para **corrigir/ajustar**. O fato de UPDATE bloqueá-lo completamente é prova de que a regra é "saldo não vem na API, só por movimento".

**Arquivo:linha confirmados:**
- Aceitação: `itemValidators.ts:14`
- Gravação: `CreateItemUseCase.ts:41`
- Propagação: `itemProductMirrorService.ts:106`
- Consumo MRP: `SequelizeItemRepository.ts:92`
- Bloqueio em UPDATE: `updateItemSchema:37-53`, `itemProductMirrorService.ts:162-169`

## 3. BLAST RADIUS — Fluxos que dependem de products.quantity estar correto

### 3.1 MRP (Planejamento de Demanda)

**Risco: ALTO — decisão de compra baseada em saldo fictício**

- `GenerateMrpPlanUseCase` → `SequelizeItemRepository.listMrpInventoryPositions` → lê `products.quantity`.
- Saldo inicial sem movimento → MRP:
  - **Subestima demanda** se `estoque_atual` declarado é maior que o real → não coloca pedido → falta matéria-prima.
  - **Superestima consumo** se `estoque_atual` declarado é menor que o real → coloca pedido desnecessário → sobra em estoque.

### 3.2 Explosão de BOM e Disponibilidade de OP

**Risco: ALTO — OP criada contra material que a produção não tem**

- `BomService.explodeBOM` → `SequelizeItemRepository.listMrpInventoryPositions` → `physicalQuantity`.
- Saldo fictício → OP liberada para consumir quantidade que **não existe fisicamente**.

### 3.3 Requisição → Compra (RFQ / PO)

**Risco: MÉDIO-ALTO — pedido cancelado ou faltante se o "saldo" descobre ser irreal**

- `ConvertRequisitionToPurchaseOrdersUseCase` valida `item.estoque_atual` como entrada no cálculo de quantidade a encomendar.
- Se saldo fictício foi usado para "não encomendar", a falta aparece agora.

### 3.4 Recebimento e Armazenagem

**Risco: MÉDIO — quantidade recebida vs. "saldo" inicial cria divergência não documentada**

- `ReceiveInventoryMovementUseCase` incrementa `products.quantity`.
- Se saldo inicial era fictício, `products.quantity` fica inflado permanentemente **sem nenhum registro de como chegou lá**.
- Contagem física + inventário não convergem; culpa caiu no supervisor de estoque, não no sistema.

### 3.5 Custeio e Valuation de Produção

**Risco: MÉDIO — custo do produto inflado ou subestimado**

- Custeio de OP lê saldo (via `listMrpInventoryPositions` ou consumo de BOM) para calcular custo de matéria-prima.
- Saldo fictício → custo de OP diferente da realidade → lucro/prejuízo do período descalibrado.

### 3.6 Previsão de Demanda (PLN)

**Risco: BAIXO — integração com ferramentas externas se lerem a API**

- Histórico de saldo raro ser consultado por clientes externos diretos; mais comum via `inventory_movements` que não foi gerado.

## 4. INVESTIGAÇÃO DE COMPORTAMENTO ESPERADO

A triagem deve produzir uma **resposta do dono** sobre qual é o comportamento correto. Três opções foram identificadas:

### OPÇÃO A: Rejeitar `estoque_atual` na criação (como na atualização)

**Descrição:** remover `estoque_atual` de `createItemSchema` (como já está fora de `updateItemSchema`). Saldo inicial sempre nasce em **zero**; qualquer carga de saldo deve ser feita **depois**, como movimento de estoque explícito.

**Prós:**
- Simplicidade: uma única fonte de saldo — `inventory_movements`.
- Auditabilidade: toda quantidade tem trilha (tipo, razão, data).
- Coerência com a intenção da atualização.
- Força fluxo correto: carga inicial = gerar movimento de entrada inicial.

**Contras:**
- Quebra a carga de 327 insumos reais se eles foram enviados com `estoque_atual`. Validação afetará migração de dados históricos.
- Requer retrabalho no script de carga (se houver) para gerar movimentos em vez de campos diretos.
- Se `estoque_atual` já foi salvo em produção, corretar requires data remediation.

**Risco de regressão: MÉDIO**
- A validação afetará clientes que enviarem saldo na criação → erro 422.
- Scripts legados quebram — novo teste será flagra.

### OPÇÃO B: Criar movimento de estoque compensatório automaticamente

**Descrição:** aceitar `estoque_atual` na criação, mas gerar **automaticamente** uma entrada em `inventory_movements` com tipo "CARGA_INICIAL" ou similar, sem que o cliente solicite.

**Prós:**
- Permite saldo inicial pela API (útil para migração/carga).
- Produz trilha de auditoria automaticamente.
- Menos quebrante que Opção A — clientes históricos continuam funcionando.

**Contras:**
- Novo tipo de movimento deve ser definido (não existe hoje "CARGA_INICIAL").
- Quem autoriza a carga inicial? Se for o `operate`, violaria aproval gates (APR-2026-021 Parte B, decisão 4: aditivo que eleva valor exige `approve`).
- Risco: movimento gerado fica com `reason: null` ou genérico; rastreabilidade confusa (ninguém pediu, não há PO, não há motivo).

**Risco de regressão: MÉDIO-ALTO**
- Novo movimento criado automaticamente pode interagir com integrações externas que consultam `inventory_movements`.
- Se a automação falhar (ex.: transaction rollback), saldo grava mas movimento não → divergência silenciosa.

### OPÇÃO C: Criar variante de POST que aceita saldo (novo endpoint)

**Descrição:** manter POST `/api/items` sem `estoque_atual`, mas criar novo endpoint `/api/items/load-with-initial-stock` ou parámetro de query que **só** o admin/aprovador pode chamar, que aceita saldo e exige aprovação registrada.

**Prós:**
- Separa fluxo normal (create item vazio) de fluxo de carga/migração (create item + saldo).
- Auditoria explícita: quem carregou, quando, com autorização de quem.
- Protege contra "acidentes" — usar a forma normal é mais fácil e seguro.

**Contras:**
- Duplicação de código/endpoint.
- Mais complexo para integrador desconhecer a diferença.
- Requer workflow de aprovação (novo) para a carga.

**Risco de regressão: BAIXO**
- Novo endpoint isolado, não quebra POST histórico.
- Requer nova documentação e treinamento.

## 5. QUESTÕES AO DONO

Antes de qualquer implementação, **três perguntas de negócio:**

1. **Qual é a intenção histórica de `estoque_atual` na criação?**
   - Era permitido deliberadamente para carga de migração/dados históricos?
   - Ou é artefato legado, uma sobra da tela antiga?

2. **Qual é a forma correta de carregar saldo inicial em produção?**
   - Via API (com qual validação)?
   - Via SQL direto (e quem autoriza)?
   - Via movimento de estoque explícito (com qual tipo)?

3. **Quem deveria autorizar uma carga inicial de saldo?**
   - `operate` (nível baixo)?
   - `approve` (nível de gestão)?
   - Admin/supervisor direto?

**Resposta esperada:** decisão de negócio que especifique A, B ou C (ou outra opção); critério de autorização; fluxo esperado.

## 6. CRITÉRIO DE RETESTE — Validação estática + dinâmica

### Estático (SanaCore pode fazer)

1. **Validação de schema bloqueada**
   - Se Opção A: `estoque_atual` removido de `createItemSchema` → `createItemSchema.parse({ estoque_atual: 100 })` deve lançar erro de validação.
   - Arquivo: `server/src/modules/items/presentation/validators/itemValidators.ts:14`.
   - Ferramenta: `npm run test -- itemValidators.test.ts`.

2. **Nenhuma alteração a `updateItemSchema`**
   - Confirmar que UPDATE continua bloqueando saldo (linha 37-53).
   - Ferramenta: leitura de arquivo + grep.

### Dinâmico (VeriCore executa com banco de teste)

**Pré-condição:** banco de teste `erp_evok_audio_test` recriado, isolado de branch SanaCore (APR-2026-024 Decisão C).

#### Teste 1: Criação com/sem `estoque_atual` (Opção A ou B)

**Cenário A (rejeição):**
```
POST /api/items com { codigo: "TST-001", estoque_atual: 500, ... }
→ esperado: HTTP 422 (validation error)
→ produtos.quantity: não existe (criação falhou)
```

**Cenário B (com movimento):**
```
POST /api/items com { codigo: "TST-002", estoque_atual: 750, ... }
→ esperado: HTTP 201 (item criado)
→ products.quantity: 750
→ inventory_movements: 1 linha com type='CARGA_INICIAL', quantity=750, reason=<deve constar>
→ audit_logs: 1 linha (se AUD-T01-02 for remediado) OU 0 linhas (se permanecer como está, apenas rejeição em 403 é logada)
```

#### Teste 2: MRP vê saldo correto

```
1. Criar item TST-003 com estoque_atual=0
2. Criar produto gêmeo (ou confirmar que existe)
3. Executar MrpPlanUseCase para esse item
4. Ler listMrpInventoryPositions(item_id)
   → estoque_atual (retornado): 0 (não fictício)
   → estoque_fisico: 0
   → Se Opção B: estoque_retido_qualidade: 0, inventory_movements: 1 entrada
```

#### Teste 3: UPDATE continua rejeitando saldo

```
PATCH /api/items/:id com { estoque_atual: 999 }
→ esperado: HTTP 422 (campo desconhecido em updateItemSchema)
```

## 7. PROVA DE AUSÊNCIA DE TESTE EXISTENTE

`audit-coverage-guard.test.ts:5-12` mede que 327 itens foram criados com apenas 2 linhas em `audit_logs`. Os testes unitários (`items-use-cases.test.ts`) **não cobrem `CreateItemUseCase`** — a linha 14-18 já mockam o mirror service.

**Evidência:** adicionar teste `CreateItemUseCase.execute({ estoque_atual: 100 })` revelará o defeito imediatamente (prova vermelha antes da correção).

## 8. ESTADO DA TRIAGEM

| Item | Status | Evidência |
|---|---|---|
| Código ainda reflete o finding? | ✓ CONFIRMADO SIM | itemValidators.ts:14; CreateItemUseCase.ts:41 |
| Saldo flui para products.quantity? | ✓ CONFIRMADO SIM | itemProductMirrorService.ts:106; SequelizeItemRepository.ts:92 |
| Sem log de auditoria? | ✓ CONFIRMADO SIM | Grep zero; audit_logs com 2 linhas para 327 items |
| Sem movimento de estoque? | ✓ CONFIRMADO SIM | inventory_movements não menciona item creation |
| Causa-raiz = assincronia create/update? | ✓ CONFIRMADO SIM | updateItemSchema bloqueia, createItemSchema aceita |
| Blast radius documentado? | ✓ CONFIRMADO SIM | 6 fluxos dependem de products.quantity: MRP, BOM, RFQ, recebimento, custeio, PLN |
| Opções de correção claras? | ✓ 3 OPÇÕES DOCUMENTADAS | A (rejeitar), B (movimento auto), C (novo endpoint) |
| Decisão de negócio pendente? | ✓ SIM — 3 PERGUNTAS | Intenção histórica; forma correta de carga; autoridade de aprovação |

## 9. AÇÕES PENDENTES

1. **Human gate obrigatório:** dono responde as 3 perguntas da seção 5 → escolhe A/B/C → aprova em `APPROVALS.md`.
2. **Após aprovação:** SanaCore passa para fase de implementação em worktree `sana/ERP-LEGACY-001/CASE-017`.
3. **Teste base:** criaremos teste base em `items-use-cases.test.ts` cobrindo `CreateItemUseCase` com `estoque_atual`.
4. **VeriCore reteste:** executa os 3 testes dinâmicos (criação, MRP, UPDATE bloqueado) contra banco efêmero.

---

**Triagem concluída em:** 2026-08-18  
**Próximo passo:** Envio ao CoreTriad Director para escalação ao dono (human gate).
