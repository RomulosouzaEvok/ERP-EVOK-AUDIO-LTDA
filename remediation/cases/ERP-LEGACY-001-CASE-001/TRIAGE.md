# TRIAGE — ERP-LEGACY-001-CASE-001 (FIND-ERP-001, GRUPO B)

CASE_ID: ERP-LEGACY-001-CASE-001
FINDING_ID: FIND-ERP-001 (GRUPO B apenas — as 6 rotas do GRUPO A NÃO estão neste caso)
PROJECT_ID: ERP-LEGACY-001
DECISÃO DE ORIGEM: APR-2026-020 (Decisão B, prioridade 1 — CRITICAL)
AUDIT_COMMIT DO FINDING: c9359be399c45191fe90e8e9707803125a5ba91d (legacy-baseline-001)
HEAD DA TRIAGEM: c1311a6f76b512fef893f7e60d934179cae3409f
FASE: TRIAGEM (nenhuma linha de `server/src`, testes existentes ou migrations foi alterada)
AGENTE: sanacore-remediation-triage
DATA: 2026-08-14

---

## 1. RECONFIRMAÇÃO NO HEAD ATUAL

Todas as âncoras do finding foram relidas diretamente no HEAD (`c1311a6`), não por
contagem de linha nem por confiança no documento:

| Âncora | Estado no HEAD | Confirmada? |
|---|---|---|
| `CreateInventoryMovementUseCase.ts:107-116` — `InventoryService.adjust(...)` chamado SEM `reference_id`/`reference_type` | idêntico | SIM |
| `inventoryService.ts:327-381` (`adjust`) — hardcoda `type: 'adjustment'`, `referenceType: 'adjustment'`, nunca define `referenceId` (linhas 356-368) | idêntico | SIM |
| `inventoryService.ts:162-190` (`createMovement`) — `InventoryMovement.create` puro, sem `findOrCreate`, sem catch de constraint | idêntico | SIM |
| `InventoryMovement.ts:57-69` — índice `{ fields: ['reference_type','reference_id'] }` (linha 65) NÃO é `unique: true` | idêntico | SIM |
| `inventoryController.ts:113-159` (`create`) — transação → use case → commit, sem checagem de duplicidade | idêntico | SIM |
| `PayPayableUseCase.ts:43-44` (guarda só `paid`/`canceled`), `:62` (acumulação), `:58-60` (teto de saldo é a única barreira) | idêntico | SIM |
| `ReceivePaymentUseCase.ts` — espelho exato do anterior | idêntico | SIM |
| `SequelizeFinancialRepository.ts:48-53` / `:81-86` — locks `transaction.LOCK.UPDATE` reais (protegem concorrência, não reenvio pós-commit) | idêntico | SIM |
| `finance.ts:30,36` / `inventory.ts:25` — rotas sem middleware de idempotência | idêntico | SIM |
| Agravante: entity (`InventoryMovementEntity.toServiceInput()`, linhas 88-97) serializa `reference_id`/`reference_type` e o use case os descarta | idêntico | SIM |

### Divergência encontrada (registro obrigatório — Regra 21)

O REMEDIATION_CASE afirma em AUDIT_COMMIT: *"houve commits posteriores, nenhum
tocando `server/src`"*. **Isso é falso.** O commit `3dee99f`
(`feat(itens,compras): espelhamento item<->produto e recebimento de imobilizado`)
alterou 8 arquivos em `server/src` entre `c9359be` e o HEAD:
`CreateItemUseCase.ts`, `UpdateItemUseCase.ts`, `CreateProductUseCase.ts`,
`ProductRepository.ts`, `SequelizeProductRepository.ts`,
`ReceivePurchaseItemsUseCase.ts`, `fixedAssetReceiptService.ts` (novo),
`itemProductMirrorService.ts` (novo).

**Impacto sobre o finding: NENHUM.** Nenhum desses arquivos é âncora do
FIND-ERP-001; nenhum toca `inventory_movements`, `InventoryService`,
`PayPayableUseCase`/`ReceivePaymentUseCase` ou as rotas afetadas (verificado
por leitura e grep). O finding permanece integralmente válido no HEAD. A
divergência é registrada apenas porque a afirmação do documento de handoff
não corresponde à evidência do repositório.

---

## 2. REPRODUÇÃO (evidência dinâmica no HEAD)

Executado em 2026-08-14: `cd server && npm run test:characterization`
(runner `scripts/run-api-suite.cjs` — carrega `server/.env.test` e o guard do
próprio runner bloqueia execução fora do banco de teste; o log confirma
`PostgreSQL conectado: localhost:5432/erp_evok_audio_test`).

**Resultado: 9/9 suítes, 66/66 testes verdes.** Em particular:

- `tests/characterization/qualidade-estoque--duplicacao-lancamento-estoque.test.ts`
  — VERDE: as duas chamadas `POST /api/inventory/movements` idênticas e
  sequenciais retornaram `201` (log HTTP do runner), dois `InventoryMovement`
  distintos persistiram (`pagination.total === 2`), saldo do produto = 20 (não
  10), e `reference_type='adjustment'`/`reference_id=null` gravados apesar do
  payload informar `555`/`'adjustment'`.
- `tests/characterization/comercial-financeiro--pagamento-parcial-repetido.test.ts`
  — VERDE: reenvio idêntico sobre título `'partial'` acumula `amount_paid`
  de novo (400→800); a 3ª tentativa só é barrada pelo teto de saldo, não por
  detecção de duplicata.

Como esses testes **congelam o comportamento defeituoso**, o verde deles é a
prova executável de que o defeito existe no HEAD exatamente como descrito.
**Causa-raiz demonstrada, não hipótese.**

---

## 3. ROOT_CAUSE

### Defeito (a) — `POST /api/inventory/movements`

Cadeia completa `inventoryController.create` → `CreateInventoryMovementUseCase.execute`
→ `InventoryService.adjust` → `createMovement` → `InventoryMovement.create`:
**nenhum elo possui identidade de operação**. Não há chave de idempotência, não
há guarda de estado (não existe estado a guardar: movimentação manual é evento
append-only, diferente das rotas do GRUPO A que têm máquina de estado de
documento), e a única candidata a defesa no banco — o índice
`(reference_type, reference_id)` — é de consulta, não-única.

**Causa sistêmica:** a movimentação manual é modelada como INSERT incondicional
de log de estoque. Toda a proteção de idempotência que o sistema tem em outras
rotas é subproduto de locks/máquinas de estado desenhados para outro fim
(confirmado pelo finding e pelo validator). Não existe política nem mecanismo
de idempotência deliberado em nenhuma camada (`app.ts` revisado: nenhum
middleware; 0 ocorrências de `Idempotency-Key` em `server/src`).

**Agravante (confirmado):** `reference_id`/`reference_type` do payload são
aceitos pelo zod (`inventoryValidators.ts:23-26`), validados pela entity, e
descartados — o use case não os repassa e a assinatura de `adjust` nem os
aceita. Consequência dupla: (1) perda de rastreabilidade (já documentada como
**achado P1-04** em
`docs/governance/auditorias/AUDITORIA_CONSISTENCIA_CADEIA_PRODUTO_2026-08-10.md`,
citado pelo próprio código em `InventoryServiceAdapter.ts:7-24`); (2) toda
movimentação manual nasce `('adjustment', null)` — o que, como demonstrado na
seção 4, **anula qualquer constraint UNIQUE de negócio sobre esses campos
como mecanismo de proteção desta rota**.

### Defeito (b) — pagamento parcial repetido

O domínio de rejeição da guarda (`status === 'paid' | 'canceled'`,
`PayPayableUseCase.ts:43-44` e espelho) não cobre `'partial'` — que é
exatamente o estado produzido por uma baixa parcial bem-sucedida. Não existe
**registro de evento de pagamento**: `amount_paid` é um acumulador sem
histórico, portanto não há contra o que deduplicar. O lock pessimista
(`findPayableByIdForUpdate`/`findReceivableByIdForUpdate`) é real, mas
resolve corrida concorrente; um reenvio sequencial pós-commit adquire o lock
livremente e reaplica.

**Causa sistêmica:** ausência de identidade de operação de pagamento + ausência
de histórico de baixas (a mesma lacuna que impede auditoria de "quem baixou o
quê, quando, em quantas parcelas").

---

## 4. BLAST_RADIUS

### 4.1 Escritores de `inventory_movements` — exatamente 2 pontos de INSERT em todo `server/src`

**Ponto 1 — `InventoryService.createMovement` (`inventoryService.ts:176`)**, alcançado por 3 funções:

| Função | Chamadores (rota/fluxo) | Protegido hoje? |
|---|---|---|
| `adjust` (grava sempre `'adjustment'`/`null`) | 1. `CreateInventoryMovementUseCase` → `POST /api/inventory/movements` (**VULNERÁVEL — GRUPO B**); também alcançado server-side por `facilities/InventoryServiceAdapter.registerConsumption` | NÃO |
| | 2. `RegisterProductMovementUseCase` → `POST /api/products/movements` | **NÃO — mesma classe de defeito, rota NÃO citada no finding** |
| | 3. `ScanItemUseCase` → `POST /api/mobile-inventory/scan` | **NÃO — reenvio do mesmo scan duplica** |
| | 4. `BatchScanUseCase` → `POST /api/mobile-inventory/batch` | **NÃO — idem, em lote** |
| | 5. `ApproveInventoryCountUseCase` → `POST /api/inventory-counts/:id/approve` | SIM (máquina de estado `pending_approval`→`adjusted`) |
| `consume` (honra reference) | `saleStockService:169` (venda), `SupplierReturnHandler:138` (RNC), `ChangeProductionOrderStatusUseCase:439` (OP) | SIM (máquinas de estado dos documentos) |
| `receive` (honra reference) | `materialReceiptService:150` (recebimento de compra/importação), `saleStockService:259`, `ChangeSaleStatusUseCase:197` (cancelamento), `ChangeProductionOrderStatusUseCase:464` (OP concluída) | SIM (recebimento: UNIQUE `(purchase_id, invoice_number)` em `purchase_receipts`; demais: máquinas de estado) |

**Ponto 2 — `SequelizeInventoryRepository.createInventoryMovement` (`:119`)**:
único chamador é `ApproveWarehouseTransferUseCase` (`:63` e `:74`) — protegido
por guarda `transfer.status === 'pending'`. **Detalhe decisivo:** cada
transferência aprovada insere **DUAS linhas com
`(reference_type='transfer', reference_id=<mesmo>, type='transfer',
product_id=<mesmo>)` idênticas** (saída da origem + entrada no destino).

### 4.2 Resposta à pergunta de desenho: constraint UNIQUE `(reference_type, reference_id, type)` quebraria fluxos legítimos?

**SIM — comprovadamente, em 4 fluxos, e ainda seria inútil para a rota vulnerável:**

1. **Transferência entre depósitos**: 2 linhas idênticas por transferência
   (evidência acima). Quebra imediata e determinística.
2. **Recebimento parcial de compra**: o mesmo produto do mesmo pedido recebido
   em duas entregas gera duas linhas `('purchase', po_id, 'in')` legítimas
   (caso de negócio documentado no próprio `ReceivePurchaseItemsUseCase`:
   "pedido de 100 recebido em 40 + 60").
3. **Produção**: conclusão de OP consome N componentes — N linhas
   `('production', op_id, 'out')`.
4. **Venda**: N itens — N linhas `('sale', sale_id, 'out')`.
5. **Inutilidade na rota vulnerável**: movimentos manuais gravam
   `reference_id = NULL` (pelo agravante E por semântica — ajuste manual não
   tem documento de origem, comentário da migration `20260810-000028`), e
   UNIQUE do Postgres trata NULLs como distintos → a constraint nunca
   dispararia justamente onde o defeito está.

**Conclusão: a alternativa "no mínimo, constraint UNIQUE de negócio" da
RECOMMENDATION 1 do finding está DESCARTADA pela triagem, com evidência.**
O desenho tem que ser por chave de idempotência.

### 4.3 Pagamentos

- `PayPayableUseCase` e `ReceivePaymentUseCase` têm **exatamente 1 chamador
  cada** (`financialController.ts:180` / `:66`), expostos em
  `PUT /api/finance/payable/:id/pay` e `PUT /api/finance/receivable/:id/pay`
  (`finance.ts:36/:30`). **CNAB NÃO reutiliza esses use cases**
  (`ProcessReturnFileUseCase` tem caminho próprio) — mudança neles não toca
  CNAB.
- Client: `client/src/api/financial.ts:60/:66` (`payPayable`/`receivePayment`,
  enviam só `{ amount }`) e `client/src/pages/financial/FinancialPage.tsx:189/:195`.
- `payAccountSchema` é `.strict()` — campo novo no body exige mudança de
  validator (prevista no plano).
- **Parcelas legítimas de mesmo valor no mesmo título são caso de negócio
  plausível** (ex.: título de R$ 1.000 baixado em 2× R$ 500 no mesmo dia).
  Nenhum artefato versionado (BR_CATALOG, BUSINESS_RULES, REQUIREMENTS_BASELINE)
  proíbe nem garante isso → **hash determinístico de
  `(id, amount, method, date)` está descartado como mecanismo único**, pois
  rejeitaria um caso possivelmente legítimo sem decisão do dono (Regra 6).
  Ver pergunta Q1 na seção 7.

### 4.4 Números-resumo

- Pontos de INSERT em `inventory_movements`: **2** (ambos mapeados).
- Fluxos que gravam a tabela: **12 call sites** via `InventoryService`
  (5 `adjust`, 3 `consume`, 4 `receive`) + **1** via repositório (transferência).
- Superfícies HTTP vulneráveis à mesma causa-raiz: **4**
  (`POST /api/inventory/movements` — a do finding; mais
  `POST /api/products/movements`, `POST /api/mobile-inventory/scan`,
  `POST /api/mobile-inventory/batch` — descobertas na triagem, ver seção 6).
- Rotas afetadas pelo defeito (b): **2** (payable/receivable pay), 1 chamador
  interno cada, 0 acoplamento com CNAB.

---

## 5. PLANO DE CORREÇÃO

### 5.1 Alternativas avaliadas

| # | Alternativa | Veredito |
|---|---|---|
| A | **Idempotency-key gerada pelo cliente (UUID por intenção de operação), persistida com índice UNIQUE parcial** | **RECOMENDADA** — única que protege duplo clique E retry de rede sem proibir nenhum caso de negócio legítimo |
| B | Hash determinístico server-side de `(id, amount, method, date)` / `(product, type, qty, dia)` | REJEITADA — bloqueia parcelas legítimas de mesmo valor e movimentos manuais legítimos repetidos; exigiria decisão de negócio que nenhum artefato responde |
| C | Constraint UNIQUE de negócio `(reference_type, reference_id, type)` | REJEITADA COM EVIDÊNCIA — quebra 4 fluxos legítimos e é inócua na rota vulnerável (seção 4.2) |
| D | Middleware genérico de idempotência (tabela de dedupe global por `Idempotency-Key`) | ADIADA — desenho sistêmico correto a longo prazo, mas blast radius muito maior (cache de resposta, TTL, replay em todas as rotas); registrar como melhoria sistêmica, não neste caso |

### 5.2 Desenho recomendado — defeito (a), estoque

1. **Migration M1**: `ALTER TABLE inventory_movements ADD COLUMN operation_id UUID NULL`
   + índice único parcial
   `CREATE UNIQUE INDEX inventory_movements_operation_id_unique ON inventory_movements (operation_id) WHERE operation_id IS NOT NULL`.
   Sem backfill (histórico fica NULL, legítimo).
2. **Model** `InventoryMovement.ts`: campo + índice único parcial declarado.
3. **Serviço** `inventoryService.ts`: `adjust`/`createMovement` ganham
   parâmetro **opcional** `operationId` (default `null` → comportamento
   idêntico ao atual para os 11 call sites internos que já são protegidos por
   suas máquinas de estado — risco de regressão zero neles).
4. **Rota** `POST /api/inventory/movements`: `operation_id` **obrigatório**
   no payload (via `createInventoryMovementSchema`; body em vez de header para
   manter o padrão zod `.strict()` já usado — o engineer pode optar por
   header `Idempotency-Key` com registro, desde que obrigatório). Controller
   captura `SequelizeUniqueConstraintError` do índice novo → `ConflictError`
   (409) com mensagem didática, **mesmo padrão in-repo de
   `ReceivePurchaseItemsUseCase`** (`UNIQUE_VIOLATION` → 409). Alternativa
   aceitável (registrar a escolha): replay idempotente — buscar o movimento
   existente por `operation_id` e devolver 200 com o registro original.
   O índice único garante a proteção **também sob concorrência real** (duas
   requisições simultâneas com a mesma chave: uma commita, a outra viola).
5. **Client** `client/src/api/inventory.ts` + página de movimentação: gerar o
   UUID **na abertura do formulário** (por intenção do usuário), NUNCA no
   clique — assim duplo clique e retry reusam a mesma chave; regenerar somente
   após sucesso confirmado. Tratar 409 como "já aplicado" (refresh da lista).
6. **Chamador interno `facilities/InventoryServiceAdapter`**: chama o use case
   direto (não passa pela rota/validator) — segue funcionando sem chave
   (`operationId=null`). Opcionalmente pode derivar chave própria por evento;
   fora de escopo obrigatório.

### 5.3 Desenho recomendado — defeito (b), pagamentos

1. **Migration M2**: tabela nova `financial_payment_events`
   (`id`, `account_type ENUM('payable','receivable')`, `account_id INTEGER`,
   `amount_cents BIGINT`, `payment_date`, `payment_method`,
   `operation_id UUID NOT NULL`, `created_by`, `created_at`/`updated_at`),
   com `UNIQUE (operation_id)` e índice de consulta
   `(account_type, account_id, created_at)`. Precedente de forma:
   `20260731-000018-create-purchase-receipts.cjs`.
2. **Use cases** `PayPayableUseCase`/`ReceivePaymentUseCase`: dentro da
   transação já existente (o lock atual permanece intocado), inserir o evento
   de pagamento com o `operation_id` recebido; violação do UNIQUE →
   `ConflictError` 409 ("esta operação de baixa já foi aplicada"). A guarda
   `status === 'paid'` existente permanece (defesa em profundidade).
3. **Contrato**: `payAccountSchema` ganha `operation_id: z.string().uuid()`
   **obrigatório**; `financialController` repassa; repositório ganha
   `createPaymentEvent(...)` (e o contrato `FinancialRepository` é atualizado).
4. **Client** `financial.ts`/`FinancialPage.tsx`: UUID gerado na abertura do
   modal de baixa; 409 tratado como "já baixado".
5. **Bônus estrutural** (motivo da tabela, e não de uma coluna
   `last_operation_id` no título): passa a existir histórico de baixas —
   corrige de tabela a lacuna "amount_paid é acumulador sem memória" e
   atende a RECOMMENDATION 2 do finding na variante mais robusta; protege
   inclusive retry tardio (a coluna "última operação" só protegeria o último
   evento).

### 5.4 Testes de regressão previstos (entrega do engineer)

- **OBRIGATÓRIO (DEPENDENCY (a) do caso)**: atualizar os DOIS testes de
  caracterização NA MESMA ENTREGA, invertendo as asserções congeladas
  (segunda chamada → 409/replay; saldo = 10, não 20; `pagination.total = 1`;
  `amount_paid` = 400 após reenvio), **citando FIND-ERP-001 + APR-2026-020
  como a decisão registrada que ampara a mudança** (mecanismo desenhado no
  passo 30):
  - `server/tests/characterization/qualidade-estoque--duplicacao-lancamento-estoque.test.ts`
  - `server/tests/characterization/comercial-financeiro--pagamento-parcial-repetido.test.ts`
  - Atenção: as asserções do agravante (`reference_type='adjustment'`,
    `reference_id=null`) **permanecem congeladas** — o agravante fica fora de
    escopo (seção 6.1).
- Novos testes de idempotência dedicados (RETEST_SPECIFICATION (e) do finding):
  - unit: use cases de pagamento rejeitam `operation_id` repetido; aceitam
    duas baixas de mesmo valor com `operation_id` distintos (protege o caso
    de negócio das parcelas iguais).
  - integração: `POST /api/inventory/movements` 2× mesma chave → 1 movimento;
    2× chaves distintas → 2 movimentos (fluxo legítimo preservado); chave
    ausente → 400.
  - integração: fluxos NÃO tocados continuam verdes (transferência entre
    depósitos, recebimento parcial de compra, aprovação de contagem, scan
    mobile) — suíte existente já cobre; rodar completa.
- Reversibilidade das 2 migrations (`down`) verificada contra
  `erp_evok_audio_test`; respeitar o guard de drift cross-database.
- Reteste formal: RETEST_SPECIFICATION (a)-(b) do finding, adaptado — as
  chamadas duplicadas devem incluir a MESMA idempotency-key. Item (c)
  (concorrência real) é do `vericore-audit-verification-runner`, não da
  SanaCore; o desenho já o favorece (índice único = proteção sob corrida).

### 5.5 FILES_AFFECTED (previsão para o engineer, worktree `sana/ERP-LEGACY-001/FIND-ERP-001`)

- `server/migrations/` — 2 novas (M1 operation_id; M2 financial_payment_events)
- `server/src/models/InventoryMovement.ts`; `server/src/models/FinancialPaymentEvent.ts` (novo) + registro em `models/index`
- `server/src/services/inventoryService.ts` (param opcional `operationId` em `adjust`/`createMovement`)
- `server/src/modules/inventory/application/use-cases/CreateInventoryMovementUseCase.ts`
- `server/src/modules/inventory/presentation/controllers/inventoryController.ts`
- `server/src/modules/inventory/presentation/validators/inventoryValidators.ts`
- `server/src/modules/inventory/domain/entities/InventoryMovementEntity.ts` (se `operation_id` passar pela entity)
- `server/src/modules/financial/application/use-cases/PayPayableUseCase.ts` / `ReceivePaymentUseCase.ts`
- `server/src/modules/financial/domain/repositories/FinancialRepository.ts` + `infrastructure/sequelize/SequelizeFinancialRepository.ts`
- `server/src/modules/financial/presentation/validators/financialValidators.ts` + `controllers/financialController.ts`
- `client/src/api/inventory.ts`, `client/src/api/financial.ts`, página de movimentação de estoque e `client/src/pages/financial/FinancialPage.tsx`
- 2 testes de caracterização (atualização obrigatória) + testes novos
- Documentação afetada: `server/src/modules/inventory/README.md`, `server/src/modules/financial/README.md`, `docs` de API se aplicável (guarda docs-drift)

### 5.6 REGRESSION_RISK

- **Call sites internos de estoque (11)**: risco **BAIXO** — parâmetro novo é
  opcional com default `null`; nenhum comportamento muda.
- **Contrato HTTP das 3 rotas alteradas**: risco **MÉDIO** — `operation_id`
  obrigatório rejeita (400) qualquer chamador que não o envie. Único
  consumidor encontrado no repositório é o client oficial (atualizado na
  mesma entrega). O adapter de facilities não passa pela rota (chama o use
  case direto) — não é afetado. Risco residual: consumidor externo não
  versionado no repo (ver pergunta Q2).
- **Pagamentos**: risco **BAIXO-MÉDIO** — INSERT adicional na mesma transação
  (custo desprezível); guarda existente preservada; CNAB não acoplado.
- **Migrations**: aditivas (coluna nullable + tabela nova) — sem reescrita de
  dados, sem NOT NULL retroativo, compatíveis com o baseline congelado.

---

## 6. POSIÇÕES DE ESCOPO (para o coretriad-director)

### 6.1 Agravante `reference_type`/`reference_id` descartados — DEPENDENCY (b) do caso

**Posição da triagem: FORA DE ESCOPO desta remediação.** Fundamentos:
(1) o desenho escolhido (idempotency-key) **não depende** dos campos de
referência — a condição do caso ("necessário se o desenho usar constraint
UNIQUE sobre esses campos") não se materializou, pois essa alternativa foi
descartada com evidência (seção 4.2);
(2) o defeito já está formalmente documentado como **P1-04** na
`AUDITORIA_CONSISTENCIA_CADEIA_PRODUTO_2026-08-10.md` e citado no código
(`InventoryServiceAdapter.ts:7-24`);
(3) corrigi-lo exige mudanças com blast radius próprio (assinatura de
`adjust`, ENUM do Postgres sem os valores de facilities, semântica do campo
`type` para movimento manual) que nada têm a ver com idempotência.
**Recomendação:** caso separado (ou absorção pela auditoria 360°
ERP-LEGACY-001-AUD-001), referenciando P1-04. Os testes de caracterização
continuam congelando o comportamento de descarte até lá.

### 6.2 Superfícies irmãs descobertas na triagem (mesma causa-raiz, fora do texto do GRUPO B)

`POST /api/products/movements`, `POST /api/mobile-inventory/scan` e
`POST /api/mobile-inventory/batch` chamam o MESMO `InventoryService.adjust`
sem nenhuma proteção — mesma causa-raiz, mesmo efeito. O mecanismo da seção
5.2 os cobre com custo marginal (~1 validator + 1 repasse de parâmetro por
rota). **Recomendação: incluir no escopo deste caso** (a missão da SanaCore
manda agrupar por causa-raiz), **mediante confirmação do director**, já que o
REMEDIATION_CASE nomeia formalmente só o GRUPO B. Se não forem incluídas,
devem virar finding/caso próprio — deixá-las sem registro seria ocultar
superfície vulnerável conhecida.

### 6.3 Fora de escopo confirmado

CNAB (RECOMMENDATION 3) e `CancelSaleNfeUseCase` (RECOMMENDATION 4) são
observações do GRUPO A — permanecem com a VeriCore/auditoria 360°, não entram
neste caso (SEVERITY do caso é restrita ao GRUPO B). Middleware genérico de
idempotência (alternativa D) registrado como melhoria sistêmica futura.

---

## 7. PERGUNTAS AO DONO (Regra 6 — nenhum artefato versionado responde)

**Q1 — Parcelas idênticas legítimas (NÃO bloqueante no desenho recomendado):**
Duas baixas parciais de MESMO valor no MESMO título (possivelmente no mesmo
dia e pelo mesmo método) são um caso de negócio real que deve continuar
permitido? *No desenho recomendado (chave por intenção do usuário) elas
continuam permitidas — cada nova intenção gera chave nova.* A pergunta só se
torna bloqueante se o dono preferir dedupe server-side sem mudança no client
(alternativa B), que as proibiria.

**Q2 — Consumidores externos da API (bloqueante para o "obrigatório"):**
Existe algum consumidor de `POST /api/inventory/movements`,
`PUT /api/finance/payable/:id/pay` ou `PUT /api/finance/receivable/:id/pay`
fora do client oficial deste repositório (n8n, bot WhatsApp, scripts,
integrações de terceiros)? O repositório não evidencia nenhum (e a decisão
registrada sobre o n8n o mantém como transporte burro), mas isso é ambiente
de implantação, não código. Se existir, `operation_id` precisa entrar como
opcional com período de transição em vez de obrigatório de imediato.

**Q3 — Semântica do reenvio (decisão técnica do engineer, registrada; listada
por transparência):** resposta ao reenvio detectado — `409 Conflict` didático
(precedente in-repo `ReceivePurchaseItemsUseCase`) ou replay idempotente
(200 com o registro original). A triagem recomenda 409 pela consistência com
o precedente; replay é aceitável se registrado.

---

## 8. CRITÉRIO DE CONCLUSÃO DA TRIAGEM — ATENDIDO

- Causa-raiz **demonstrada** (leitura de todas as âncoras no HEAD + suíte de
  caracterização verde reproduzindo o defeito dinamicamente contra banco
  efêmero), não hipótese.
- Blast radius mapeado com números (seção 4.4), incluindo a resposta negativa
  fundamentada à alternativa de constraint UNIQUE.
- Plano de correção com alternativas avaliadas, recomendação, migrações,
  testes de regressão e atualização obrigatória dos testes de caracterização
  (seção 5), risco de regressão avaliado (5.6).
- Handoff: **sanacore-remediation-engineer**, worktree
  `sana/ERP-LEGACY-001/FIND-ERP-001`. Fechamento do finding permanece
  autoridade exclusiva da VeriCore (Regras 3-4).
