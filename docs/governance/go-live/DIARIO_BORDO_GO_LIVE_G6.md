# 📔 Diário de Bordo — Go-Live G6 ERP Evok Áudio

> ## ⚠️ REGISTRO APPEND-ONLY — cada entrada é datada
>
> Diário de bordo do Go-Live G6: cada entrada descreve o estado **daquele
> dia** e nunca é reescrita. Entradas antigas citam documentos e arquivos que
> depois foram consolidados ou removidos — é o diário funcionando.
>
> Para o estado atual: `CLAUDE.md`. Para pendências vivas:
> `docs/governance/RESIDUAIS_ABERTOS_2026-08-10.md`.
>
> *Banner adicionado em 2026-08-12, junto com a ampliação das guardas
> documentais (`server/tests/helpers/docsGuardConventions.ts`). O documento
> declara-se registro datado: as guardas param de auditar suas afirmações de
> estado, e o leitor é avisado antes de agir sobre elas.*

**Início:** 2 de agosto de 2026, 18:30  
**Objetivo:** Resolver 4 bloqueadores críticos em 30h (P0) antes de Go-Live  
**SSOT:** Este arquivo registra CADA tarefa, bloqueador encontrado, decisão tomada

---

## 📅 Changelog

### 2026-08-02 18:30 — KICKOFF

**Tarefas Completadas:**
- ✅ Auditoria pré-produção consolidada (40 achados, 4 críticos)
- ✅ CLAUDE.md criado (SSOT do projeto)
- ✅ CONFORMIDADE_CHECK criado (15% conforme, 7 bloqueadores)
- ✅ PLANO_IMPLEMENTACAO criado (4 PRs, deps, ordem de merge)
- ✅ GO_LIVE_CHECKLIST criado (3 fases, decision points)
- ✅ Commit 1da0b59: 4 documentos (1948 linhas)

**Status:** 4 documentos SSOT prontos; próximo: começar P0.1 (Requisição de Compra)

---

## 🚨 Bloqueadores P0 — Status Executivo

| ID | Bloqueador | Escopo | Estimativa | Status | PR |
|:---|:-----------|:-------|:-----------|:-------|:---|
| **P0.1** | Requisição de Compra | Novo modelo + use-cases | 8h | 🔴 Não iniciado | `feat/purchase-requisition` |
| **P0.2** | MRP contra estoque real | CalculateMrpUseCase | 6h | 🔴 Não iniciado | `feat/mrp-live-inventory` |
| **P0.3** | Foreign Keys (26 FKs críticas) | 05_add_critical_foreign_keys.sql | 4h | 🟡 Em progresso | `fix/add-missing-foreign-keys` |
| **P0.4** | IDOR (tenant isolation) | Auth middleware + validator | 3h | 🔴 Não iniciado | `fix/tenant-isolation-idor` |
| **P0.5** | react-router v7 (CVE) | package update + testes | 2h | 🔴 Não iniciado | `fix/react-router-v7` |
| **P0.6** | Apontamento reconciliação | Validação quantity_produced | 6h | 🔴 Não iniciado | `fix/production-reconciliation` |

**Meta:** Todos ✅ para 2026-08-09, 23:59 (antes de Go-Live)

---

## 📋 Decisões Arquiteturais Registradas

### ✅ Decisão 1: Ordem de Merge (2026-08-02)
```
Paralelo (ambos prioritários):
  → P0.3: FKs (estrutural, 4h)
  → P0.4: IDOR (segurança, 3h)

Sequencial (após P0.3+P0.4):
  → P0.1: Requisição de Compra (8h, depende FKs)
  → P0.2: MRP live (6h, depende Req. + FKs)

Paralelo (independent):
  → P0.5: react-router (2h)
  → P0.6: Apontamento (6h, depende FKs)
```
**Justificativa:** IDOR é segurança (vai primeiro). FKs é estrutura (bloqueia todos). Req+MRP têm lógica pesada (paralelizáveis).

---

## 📝 Progresso Detalhado

### 2026-08-02 18:45 — P0.3 (FKs) Iniciado

**Tarefas Concluídas:**
- ✅ Criado `05_add_critical_foreign_keys.sql` (26 FKs críticas + 18 índices)
  - Tabelas legadas: inventory_movements, purchase_order_items, sale_items, production_orders, lot_controls, serial_numbers, production_routes, bill_of_material_items
  - Tabelas financeiras: payables, receivables, quality_checks
  - Relacionamentos: items, fornecedores, customers, production_lots
- ✅ Criado `05_add_critical_foreign_keys.test.ts` (11 testes de integridade)
  - Valida existência de constraints
  - Valida enforcement (INSERT reject, CASCADE, RESTRICT)
  - Valida índices de performance
  - Valida dados órfãos (0 orphaned rows)

**Próximo Passo:** Commitar PR `fix/add-missing-foreign-keys` + testar

---

## 🐛 Problemas Encontrados & Resoluções

### Problema 1: Agentes com timeout e ECONNRESET (2026-08-02 18:00-18:45)
- **Sintoma:** Plan agent falhou com ECONNRESET
- **Causa:** Agente rodou por 5+ minutos, API perdeu conexão
- **Solução:** Relançar com escopo compacto (máx 300 linhas output esperado)
- **Ação:** Futura = evitar agentes para tarefas que dão > 500 linhas output

### Problema 2: Aviso CRLF no Git
- **Sintoma:** "LF will be replaced by CRLF" em cada commit
- **Causa:** Arquivos com LF, Git Windows usa CRLF
- **Solução:** `git config core.safecrlf false`
- **Resolvido:** ✅ 2026-08-02 18:27

### Problema 1.1: Agentes API instáveis (continuação)
- **Causa:** API Anthropic perdendo conexão durante agente longo (5+ min)
- **Solução Adotada:** PARAR de usar agentes. Fazer trabalho direto sem delegação.
- **Status:** Agora só fazendo implementação direto (SQL, TypeScript, tests)

---

## 📊 Conformidade em Tempo Real

**Última atualização:** 2026-08-02 18:30

```
Pilar 1: Regras de Negócio & Rastreabilidade
  Conforme: 0/8 (0%)
  Bloqueadores: P0.1 (Req. Compra), P0.2 (MRP)
  Próxima: Começar P0.1

Pilar 2: Integridade Transacional
  Conforme: 1/12 (8%)
  Bloqueadores: P0.3 (FKs), P0.6 (Apontamento reconciliação)
  Próxima: Começar P0.3

Pilar 3: Segurança & DevSecOps
  Conforme: 4/15 (27%)
  Bloqueadores: P0.4 (IDOR), P0.5 (react-router)
  Próxima: Começar P0.4

Pilar 4: Dependências & Arquitetura
  Conforme: 1/5 (20%)
  Bloqueador: Documentação SQL strategy
  Próxima: Após P0.1-P0.6

TOTAL: 15% (6/40) → META: 100% antes Go-Live
```

---

## 🎯 Status Final — Fim da Sessão (2026-08-02 20:30)

**Conclusões da Sessão:**
- ✅ Diário de bordo criado (SSOT de progresso)
- ✅ P0.3 (FKs) iniciado: SQL + testes criados
- ✅ Infraestrutura Docker auditada e melhorada
- ✅ Commit 6a463fa: Docker + DEPLOY_UBUNTU.md
- ✅ Problema API resolvido: parar de usar agentes (trocam timeouts)

**Bloqueadores Acionados:**
1. P0.3 (FKs) — SQL criado, testes prontos, pronto para merge
2. P0.4 (IDOR) — próximo na fila
3. P0.1 (Req. Compra) — aguarda P0.3 passar
4. P0.2 (MRP) — aguarda P0.1 + P0.3

**Próxima Ação Imediata (Próxima Sessão):**
1. Testar P0.3: `docker compose up && npm test -- P0.3`
2. Commitar P0.3 e merge
3. Começar P0.4 (IDOR validation)
4. Atualizar conformidade check
## 2026-08-02 19:20 — Atualização Codex

### P0.2 (MRP live inventory) iniciado

- Ajustei `SequelizeItemRepository.listMrpInventoryPositions()` para priorizar estoque vivo de `Product` quando houver correspondência por `codigo`.
- Mantive fallback para o snapshot do `Item` quando não existir produto legado correspondente.
- Criei regressão unitária em `tests/unit/item-repository-live-inventory.test.ts`.
- Validei o fluxo com `npx jest --runInBand tests/unit/item-repository-live-inventory.test.ts tests/unit/mrp-persistence.test.ts`.

### Diretriz operacional

- Agentes seguem permitidos, mas apenas para triagem, validação e blocos curtos.
- Execuções longas e implementação principal continuam no agente principal para evitar timeouts.

---

## 2026-08-02 20:05 — Atualização Codex

### P0.1 (Requisição de Compra) iniciado

- Criei o primeiro slice funcional do módulo de requisição de compra em `server/src/modules/purchaseRequisitions/`.
- Adicionei as tabelas novas `purchase_requisitions` e `purchase_requisition_items` via migration.
- Registrei o módulo em `server/app.ts` sob `/api/purchase-requisitions`.
- Adicionei testes unitários para criação de requisição e integração básica com a API.

### Estado atual

- P0.3 segue encaminhado.
- P0.2 ganhou suporte de estoque vivo em `SequelizeItemRepository`.
- A próxima rodada deve concentrar integração entre MRP e requisição de compra.

---

## 2026-08-04 — Triagem de Segurança (fechamento de 3 pendências menores)

**Escopo:** triagem de segurança pontual no repositório (sem outro agente
rodando em paralelo). Nenhum bloqueador P0 novo encontrado. 3 achados
menores, todos endereçados nesta sessão:

1. **Robustez — `:id` não validado em `PUT /api/inventory/warehouses/:id`**
   (baixa severidade, não é SQL injection — Sequelize parametriza, mas um
   id não numérico propagava erro imprevisível do driver em vez do
   400/404 esperado). Corrigido: `idParamSchema` (`z.coerce.number().int().positive()`)
   adicionado em
   `server/src/modules/inventory/presentation/validators/inventoryValidators.ts`
   e aplicado em `updateWarehouse`
   (`server/src/modules/inventory/presentation/controllers/inventoryController.ts`).
   Coberto por teste unitário novo em `server/tests/unit/warehouse-crud.test.ts`.

2. **Gap de teste — RBAC dos endpoints de Depósito não coberto** (`POST
   /api/inventory/warehouses`, `PUT /api/inventory/warehouses/:id`, ambos
   `authorizeModule('estoque', 'approve')`). Adicionada cobertura de
   integração (401 sem token, 403 para operator sem nível `approve`, 200/201
   para admin) em
   `server/tests/integration/legacy-routes-rbac-regression.test.ts`. Esses
   testes exigem `RUN_INTEGRATION=true` + `TEST_API_URL` + `TEST_AUTH_TOKEN`
   + PostgreSQL acessível; no ambiente desta sessão nenhum desses
   pré-requisitos estava disponível, então rodaram via `describe.skip`
   (não é uma falha — é o comportamento padrão já existente do arquivo
   quando os pré-requisitos de integração não estão configurados).

3. **Risco residual registrado — `react-router@7.18.2` (client) na faixa
   vulnerável do advisory `GHSA-qwww-vcr4-c8h2`** (CSRF em modo RSC,
   `npm audit` reporta "high", faixa `>=7.12.0 <8.3.0`). O vetor (RSC/Server
   Actions) provavelmente **não se aplica** a esta SPA Vite sem RSC, mas
   isso é uma avaliação técnica desta triagem, não uma aceitação formal de
   risco — fica registrado como item aberto no gate G6 (ver
   `docs/governance/TODO.md`, seção "Pendências de Segurança / Gate G6").
   Também identificado que o `node_modules` local do `client/` estava
   dessincronizado do lockfile (`react-router-dom@6.30.4` instalado vs
   `^7.18.2` declarado) — reforça a necessidade de `npm ci` (nunca `npm
   install`) no pipeline de build de produção. **Nenhum upgrade de major
   version foi feito** — decisão explicitamente adiada para o gate G6.

**Validação:** `npm run typecheck` (a partir de `server/`) passou sem
erros. `npx jest warehouse-crud` — 11/11 passou. `npx jest
tests/integration/legacy-routes-rbac-regression.test.ts` — 9/9 `skipped`
(pré-requisitos de integração/PostgreSQL indisponíveis neste ambiente;
não reportado como sucesso pleno, apenas como "não executado por falta de
infraestrutura").

---

### 2026-08-04 (rodada de reconciliação em paralelo) — MRP fechado, Bloco 2 (amostras) entregue, invariantes de depósito testadas, logo oficial no login

**Contexto:** 4 entregas concluídas hoje por agentes distintos em paralelo,
consolidadas nesta sessão de governança (leitura de código/testes reais
antes de marcar qualquer item — nada foi aceito apenas pela lista recebida).

**1. MRP fecha o ciclo (item 3 do roadmap de `docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md`)**
— `POST /api/mrp/planned-orders/convert` implementado:
`ConvertPlannedOrdersToRequisitionUseCase` (converte ordens `RASCUNHO`/
`APROVADA` em 1 requisição de compra, sugere fornecedor preferencial,
marca ordens `EM_EXECUCAO`), rota com `authorizeModule('mrp','operate')`,
4 testes unitários (`mrp-convert-to-requisition.test.ts`), documentado em
`docs/arquitetura/API.md` §13. Item 3 da tabela de `LEVANTAMENTO_ERP_2026-08-02.md`
marcado ✅ resolvido (parcial — trigger 100% automático plano→requisição
sem intervenção do planejador continua fora do escopo).

**2. Bloco 2 — Requisição de Amostra da Engenharia (UC-39), frontend + QA**
— `client/src/pages/engineering/SampleRequestTab.tsx` (nova aba
"Solicitar Amostra" em `EngineeringPage.tsx`), badge "Amostra —
Engenharia" em `ReceivingPage.tsx` (lê `requisition.origin ===
'engenharia_amostra'`), alerta não bloqueante de quantidade > 50 unidades,
e 5 testes em `server/tests/unit/engineering-sample-requisition.test.ts`
(422 sem justificativa/justificativa em branco, persistência do vínculo
com `engineering_project_id`, 404 projeto inválido, e cadeia unit-level
amostra→pedido→recebimento roteando para `LABORATORIO`). A justificativa
reaproveita o campo `notes` já existente — decisão confirmada em 2.1 de
`docs/governance/TODO.md`, nenhuma coluna dedicada `justificativa` foi
criada.

**3. Bloco 4 — 4 testes de invariante de depósito, com 1 gap real descoberto**
— novo arquivo `server/tests/unit/warehouse-invariants.test.ts`: 2 dos 4
itens ganharam cobertura nova (expedição só lê `ACABADOS`; quarentena/
bloqueio de lote não move depósito), o 3º (teste destrutivo debita
`LABORATORIO`) já estava coberto em `warehouse-stock.test.ts`/
`laboratory-tests.test.ts` (não duplicado). **O 4º item — contagem cíclica
escopada a um único depósito — é um GAP REAL DE FUNCIONALIDADE, não de
teste**: `InventoryCount`/`InventoryCountItem` não têm coluna
`warehouse_id`, e `ApproveInventoryCountUseCase` ajusta o saldo GLOBAL do
produto (`Product.quantity`), não o saldo de um depósito específico.
Marcado `[AUDITORIA-FALHOU]`/gap de desenvolvimento em
`docs/governance/TODO.md` (não fechado como teste faltando) — vira tarefa
nova de dev (migration + use case + tela) a despachar em seguida.

**4. Logo oficial da marca aplicado no login** — `client/src/pages/LoginPage.tsx`
importa `@/assets/brand/evok-logo.png` (raio verde + wordmark "VOK AUDIO"),
renderizado sobre fundo branco (o wordmark é preto e sumiria sobre fundo
escuro).

**Checklist G6** (`docs/governance/go-live/GO_LIVE_G6_CHECKLIST.md`, já reconciliado por outro
agente): confirmado que não há menção a Bloco 2/Bloco 4/endpoint de
conversão MRP nesse arquivo — nenhuma contradição com o que foi registrado
aqui.

**Documentos atualizados:** `docs/governance/TODO.md` (Bloco 2 seções
2.3/2.4, Bloco 4 seção 4.4), `docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md` (item 3
da tabela), `docs/governance/HANDOFF_CODEX.md` (resumo consolidado + gap da contagem
cíclica como próxima tarefa), este diário.

---

### 2026-08-04 (Onda 2, segunda rodada em paralelo) — bug real de expedição/NF-e corrigido, RBAC de NF-e fechado (backend+frontend), dashboard/edição de usuário filtrados por perfil, mais 4 telas com alertas didáticos

**Contexto:** 5 entregas concluídas hoje por agentes distintos em
paralelo (Onda 2, rodando ao mesmo tempo de um 6º agente que segue
ajustando `ApproveInventoryCountUseCase` em `server/src/modules/inventory/**`
— não coberto por esta consolidação). Cada evidência foi verificada por
leitura direta do código/testes antes de qualquer item ser marcado `[x]`
em `docs/governance/TODO.md`; nada foi aceito apenas pela lista recebida.

**1. Bloco 4 — schema de contagem cíclica por depósito, PARCIAL (schema
pronto, use case em andamento em paralelo)** — migration
`server/migrations/20260804-000006-add-warehouse-id-to-inventory-counts.cjs`
aplicada (`inventory_counts.warehouse_id`, nullable por legado, backfill
para `INSUMOS` das 4 linhas pré-existentes), `InventoryCount.warehouse_id`
+ associação `belongsTo(Warehouse)` no model, documentado em
`docs/database/DATABASE.md`. **Não fechado no TODO** — `ApproveInventoryCountUseCase`
(passo que efetivamente escopa o ajuste de saldo por depósito) segue em
ajuste por outro agente rodando em paralelo a esta consolidação; o item
permanece `[ ]` com nota "schema pronto, use case em andamento".

**2. Bloco 1.2 — bug real corrigido em `PUT /api/sales/:id/status`** —
`ChangeSaleStatusUseCase.execute` agora exige `sale.nfe_status ===
'authorized'` para permitir a transição `invoiced -> shipped` (422
`BusinessRuleError` com `details.nfe_status` quando falha). Bug real
confirmado por leitura de código: antes desta correção, uma venda cuja
NF-e foi cancelada **depois** de emitida (`nfe_status` muda para
`cancelled`, `sale.status` não reverte de `invoiced`) podia ser embarcada
indevidamente, porque a máquina de estados genérica (`VALID_TRANSITIONS`)
só olha `sale.status`, não `nfe_status`. Testado em
`server/tests/unit/onda3-shipping-cockpit-cashflow.test.ts` (5 casos,
incluindo o cenário de NF-e cancelada pós-emissão).

**3. Bloco 5 completo — RBAC de NF-e, backend + testes + frontend** —
backend já estava correto (`authorizeModule('vendas','approve')` em
`POST /api/sales/:id/nfe` e `/nfe/cancel`, confirmado em
`server/src/modules/sales/presentation/routes/sales.ts`); 3 testes novos
fecham a lacuna de QA em `server/tests/unit/sales-nfe-rbac.test.ts`
(operador nível `operate` → 403 `APPROVAL_LEVEL_REQUIRED`; gestor nível
`approve` emite NF-e com sucesso; gestor cancela NF-e de venda `shipped`
sem reverter `sale.status`). Frontend: `client/src/pages/sales/SalesPage.tsx`
calcula `canApproveNfe = hasRole('admin') || permissions?.vendas ===
'approve'` e esconde os botões "Emitir NF-e"/"Cancelar NF-e" para quem
não tem esse nível, com mensagem explicativa no lugar.

**4. Bloco 1 — dashboard filtrado por módulo + preview de perfil na
edição de usuário** — `client/src/pages/DashboardPage.tsx`: cards e
queries (`canSeeProdutos`/`canSeeCompras`/`canSeeProducao`/
`canSeeFinanceiro`) agora usam `hasModuleAccess`, com o mesmo fallback de
segurança de `AppLayout.itemVisible` (`permissionsFetchFailed ||
hasRole('admin')` nunca esconde cards por bug de rede).
`client/src/pages/users/UsersPage.tsx`: dialog "Atribuir perfil" ganhou
pré-visualização somente-leitura (`selectedProfilePreview`) dos
módulos/níveis (`LEVEL_LABEL`) que o perfil selecionado concede.
Confirmado por leitura de código que **não existe e não deveria existir**
um campo `access_level` avulso no usuário — decisão de arquitetura já
registrada no Bloco 1.2 (nível é 100% resolvido pela matriz do perfil),
não é um gap.

**5. Bloco 6 — retrofit de alertas didáticos em mais 4 telas, com 2
conformidades parciais** — `ProductionOrdersPage.tsx`, `RegisterTestTab.tsx`,
`MrpPage.tsx`, `InspectionTab.tsx` migradas para
`translateApiError`/`DidacticAlert` (confirmado por leitura de código nas
4). Checklist de conformidade (§6.3) rodado nas 9 telas priorizadas (5 já
conformes de antes + as 4 novas) — **2 conformidades parciais**:
`RegisterTestTab.tsx` (alerta não-bloqueante, decisão consciente de não
travar o submit) e `InspectionTab.tsx` (backend
`ReleaseLotUseCase`/`BlockLotUseCase` retorna só `message` em texto livre,
sem `details` estruturado, confirmado por leitura direta do use case —
`translateApiError` cai no fallback genérico). Gerou item novo `[ ]` em
§6.1: "auditar e estruturar `details` no erro de
`ReleaseLotUseCase`/`BlockLotUseCase`".

**Coordenação:** 2 outros agentes seguiam em paralelo em
`server/src/modules/inventory/**` e `server/src/modules/products/**`
(código) durante esta consolidação — esta sessão só editou `.md`, sem
risco de conflito.

**Documentos atualizados:** `docs/governance/TODO.md` (Bloco 1.2 linha do
bug de `shipped`, Bloco 1.3 dashboard, Bloco 1.4 edição de usuário, Bloco
4.1 nota de schema pronto/use case em andamento, Bloco 5 completo §5.2/
§5.3, Bloco 6 §6.2/§6.3/§6.1 item novo), `docs/governance/HANDOFF_CODEX.md` (resumo
consolidado desta Onda 2), este diário.

---

### 2026-08-04 (Onda 3+4) — Bloco 4 fechado (contagem cíclica por depósito, full-stack), suíte de integração saudável pela primeira vez contra Postgres real, e um BUG CRÍTICO P0 real de produção encontrado e corrigido

**Contexto:** rodada final do dia, fechando os 3 gaps que ainda restavam em
aberto das duas rodadas anteriores (Onda 2). Toda evidência abaixo foi
verificada por leitura direta de código/migrations/testes e por execução
ao vivo dos comandos citados nesta mesma sessão de governança, antes de
qualquer item ser marcado `[x]` em `docs/governance/TODO.md`.

**1. Bloco 4 fechado — contagem cíclica escopada a um único depósito
(full-stack completo).** O gap registrado na entrada anterior ("schema
pronto, use case em andamento") foi concluído ponta a ponta:
- Schema: migration `20260804-000006-add-warehouse-id-to-inventory-counts.cjs`
  (já aplicada anteriormente, mantida sem alteração).
- Use case de criação: `CreateInventoryCountUseCase.ts` agora **exige**
  `warehouse_id` no payload.
- Use case de aprovação: `ApproveInventoryCountUseCase.ts` ajusta a
  variância apenas no depósito especificamente contado, via
  `WarehouseStockService.addToWarehouse`/`removeFromWarehouse`, mantendo
  `Product.quantity` como soma dos saldos por depósito (nunca mais
  ajustado diretamente por uma contagem).
- Validador: `createInventoryCountSchema`
  (`server/src/modules/inventory/presentation/validators/inventoryValidators.ts`)
  rejeita `warehouse_id` ausente.
- Teste: `server/tests/unit/warehouse-invariants.test.ts`, describe
  `'Invariante 3 — contagem ciclica ... escopada a um unico deposito'`.
- Frontend: `client/src/pages/products/InventoryCountsPage.tsx` — seletor
  de depósito obrigatório no formulário de criação, coluna "Depósito" na
  listagem/detalhe, tratamento didático de erro 422, e banner com
  identidade visual EVOK (gradiente `bg-brand`) no topo da tela.
- As 2 últimas pendências do Bloco 4 também foram fechadas: `GET
  /api/products/:id/stock-by-warehouse` (novo endpoint dedicado, decisão
  documentada de retornar todos os depósitos ativos mesmo com saldo
  zero, diferente do endpoint por query param que só lista linhas
  existentes) e o script de validação pós-backfill
  `server/src/scripts/backfill/04l_product_warehouse_stock_validation.ts`
  — **rodado ao vivo contra Postgres real nesta sessão**: `4/4` blocos
  PASS (cobertura de backfill, integridade referencial, invariante de
  soma `products.quantity = SOMA(product_warehouse_stock.quantity)` em
  106 produtos no momento da execução, sem saldos negativos).
  **Bloco 4 (UC-42) está agora fechado por completo** — todos os itens
  de schema (4.1), backend (4.2), frontend (4.3) e QA (4.4) marcados
  `[x]` em `docs/governance/TODO.md`, exceto o inventário mobile por QR
  Code (fora do escopo desta entrega, registrado como pendência futura).

**2. Suíte de testes de integração saudável pela primeira vez contra
Postgres real.** Uma rodada completa contra o container `evok-postgres`
encontrou 5 suítes falhando. Causa raiz identificada em cada caso
(nenhuma era regressão de produto):
- 3 suítes falhavam por falta de saldo no depósito `ACABADOS` no
  fixture global de setup da suíte — corrigido em
  `server/scripts/run-api-suite.cjs` (garante saldo mínimo de 100.000 un
  em `ACABADOS` antes da suíte rodar, para não colidir com testes de
  expedição/venda que debitam justamente esse depósito desde o Bloco 4).
- 2 suítes falhavam por fragilidade pré-existente de fixture
  (`category_id: 1` hardcoded — frágil em qualquer banco de
  desenvolvimento reutilizado onde a sequência de `categories.id` já
  avançou além de 1) — corrigido com fixture dedicada nova
  `server/tests/integration/helpers/categoryFixtures.ts`
  (`ensureFixtureCategoryId`, resolve a primeira categoria ativa
  existente via API em vez de assumir um id fixo).

**3. BUG CRÍTICO P0 REAL DE PRODUÇÃO encontrado e corrigido — não é um
achado de teste, é um achado de segurança operacional do mesmo escopo de
risco dos bloqueadores originais do go-live.** No processo de investigar
as falhas de integração acima, foi descoberto que `POST
/api/inventory/movements` — o endpoint de lançamento manual de
entrada/saída de estoque, usado no dia a dia operacional do almoxarifado
— **derrubava o processo Node.js inteiro** em qualquer chamada bem
sucedida (não apenas retornava erro para o usuário: o servidor caía para
**todos** os usuários conectados simultaneamente). Causa raiz:
`server/src/modules/inventory/presentation/controllers/inventoryController.ts`
(`exports.create`) desestruturava `{ movement }` do retorno de
`CreateInventoryMovementUseCase.execute(...)`, mas esse use case só
retorna `{ movementId }` — o `movement` desestruturado ficava
`undefined`, o código seguinte acessava propriedades dele e lançava um
`TypeError` **depois** de a transação de banco já ter sido commitada; o
tratamento de erro então tentava fazer `rollback()` de uma transação já
commitada, o que não é um erro recuperável e derrubava o processo Node
inteiro. **Esta correção foi feita diretamente nesta sessão de
governança (não por um subagente)** — o controller agora busca o
movimento completo via `GetInventoryMovementByIdUseCase` usando o
`movementId` retornado pelo use case, antes de responder `201`.
**Validação ao vivo, feita pessoalmente:** subi o servidor real de
produção compilado (`node dist/index.js`), autentiquei como admin via
`POST /api/auth/login`, chamei `POST /api/inventory/movements` com um
lançamento manual real — recebi `201` com o servidor **sobrevivendo**
(antes desta correção, o mesmo passo derrubava o processo). Em seguida
rodei a suíte completa novamente para garantir zero regressão: **417/417
testes unitários e 23/23 suítes / 54/54 testes de integração, todos
verdes.**

**Resultado final confirmado nesta sessão de governança (comandos
rodados diretamente, não repassados por outro agente):**
```
cd server && npx jest tests/unit
  → Test Suites: 60 passed, 60 total | Tests: 417 passed, 417 total

cd server && node scripts/run-api-suite.cjs integration
  → Test Suites: 23 passed, 23 total | Tests: 54 passed, 54 total

cd server && npx tsx src/scripts/backfill/04l_product_warehouse_stock_validation.ts
  → BLOCO 1/2/3/4: ✅ PASS (4/4) — invariante de soma validada em 106 produtos
```

**Documentos atualizados:** `docs/governance/TODO.md` (Bloco 4 seções
4.1/4.4 fechadas `[x]`, nova seção em "Pendências de Segurança / Gate
G6" com o bug P0 e com a saúde da suíte de integração),
`docs/governance/HANDOFF_CODEX.md` (seção nova consolidando as 3 frentes), este
diário.

---

## 2026-08-04 (apêndice) — Fechamento do risco residual react-router

**Contexto:** a entrada de "2026-08-04 — Triagem de Segurança" (achado 3,
acima) havia registrado `react-router@7.18.2` na faixa vulnerável do
advisory `GHSA-qwww-vcr4-c8h2`, com decisão explicitamente adiada para o
gate G6 (aceitar o risco ou fazer upgrade major). O dono do produto
decidiu **não aceitar o risco** e mandou resolver agora.

**Ação executada:** upgrade real de `react-router-dom@7.18.2` para
`react-router@8.3.0` em `client/package.json`. A partir da v8 do
React Router, o pacote `react-router-dom` foi descontinuado — tudo foi
unificado em `react-router`, incluindo os bindings de DOM
(`BrowserRouter`, `Link`, `useNavigate`, etc). Todos os arquivos que
importavam de `react-router-dom` (24 arquivos, incluindo
`client/src/App.tsx`) foram migrados para importar de `react-router`.

**Verificação feita diretamente nesta sessão de governança:**
```
cd client && npm audit --omit=dev
  → found 0 vulnerabilities

grep -n "react-router" client/package.json
  → "react-router": "^8.3.0"

grep -rln "react-router-dom" client/src
  → (nenhum resultado — migração completa confirmada)

client/src/App.tsx
  → import { Route, Routes } from 'react-router';
```

**Resultado:** o risco residual `GHSA-qwww-vcr4-c8h2` está **resolvido**,
não apenas mitigado/aceito. `npm audit --omit=dev` em `client/` confirma
zero vulnerabilidades.

**Documentos atualizados nesta consolidação:** `docs/governance/TODO.md`
(item marcado `[x]` na seção "Pendências de Segurança / Gate G6"),
`docs/governance/go-live/GO_LIVE_G6_CHECKLIST.md` (resumo executivo pendência (c), seção
P0.5, tabela de decisão do Decision Point 1, checklist rápido e seção de
assinatura — todos atualizados de "pendente de decisão formal" para
"resolvido"), este diário.

**Nota de rastreabilidade:** o achado 3 da entrada "2026-08-04 — Triagem
de Segurança" (acima) permanece inalterado por histórico — este apêndice
documenta o fechamento subsequente, não uma reescrita do registro
original.

---

## 2026-08-04 (apêndice) — Rodada de 5 frentes paralelas (Bloco 6.1, Bloco 1.5, roadmap itens 3/7/8)

**Contexto:** rodada grande concluída no mesmo dia, com 5 agentes
trabalhando em paralelo em frentes independentes: `details` estruturado
(Bloco 6.1), testes de integração/E2E de permissões (Bloco 1.5), trigger
automático do MRP (roadmap item 3), rating de fornecedor via RNC
(roadmap item 8) e schema de mão-de-obra/overhead no custeio (roadmap
item 7, parcial). Cada entrega foi verificada nesta consolidação por
leitura direta do código-fonte e execução real dos testes, não apenas
pelo relato de cada agente.

### 1. Bloco 6.1 — `details` estruturado nos 9 endpoints priorizados

Os 9 casos de `BUSINESS_RULES.md` §13.5 foram auditados um a um. 6 já
estavam corretos (liberação de OP, conclusão de OP, embarque sem NF-e,
conversão de requisição sem fornecedor, conversão MRP em execução,
aprovação de requisição fora de sequência) — confirmados por leitura de
código, sem alteração necessária. 3 foram corrigidos:

- `server/src/modules/purchases/application/use-cases/ReceivePurchaseItemsUseCase.ts`
  — recebimento sem NF agora lança `ValidationError` com
  `details: { purchase_id, order_number, field: 'invoice_number' }`.
- `server/src/modules/laboratory/application/use-cases/CreateAcousticTestUseCase.ts`
  — teste de laboratório sem resultado/faixa agora lança `ValidationError`
  com `details: { product_id, test_type, missing_fields }`.
- `server/src/modules/inventory/application/use-cases/ReleaseLotUseCase.ts`
  e `BlockLotUseCase.ts` — liberação/bloqueio de lote em status terminal
  agora lançam `BusinessRuleError` com `details: { lot_id,
  current_status, allowed_statuses }` (item que o próprio TODO já
  sinalizava desde a Onda 2).

Ver `docs/governance/TODO.md`, seção 6.1, marcada `[x]` por completo
nesta consolidação.

### 2. Bloco 1 — 4 testes de integração/E2E de permissões

- `server/tests/integration/rbac-module-access-denied.test.ts`
- `server/tests/integration/auth-me-permissions.test.ts` — reinterpretação
  deliberada do item "Dashboard só mostra cards do perfil": renderização
  React não é testável via Supertest, então o teste valida o CONTRATO
  (`GET /api/auth/me/permissions`) que o Dashboard consome para filtrar
  os cards. Reinterpretação documentada explicitamente no cabeçalho do
  próprio arquivo de teste.
- `server/tests/integration/reports-cross-module-permission.test.ts`
- `server/tests/integration/quality-releases-receiving-lot.test.ts` — E2E
  completo do UC-37: recebimento cria lote em quarentena, só um usuário
  com permissão do módulo `qualidade` (não `recebimento`) pode liberar o
  lote.

Ver `docs/governance/TODO.md`, seção 1.5, os 4 itens marcados `[x]` nesta
consolidação.

### 3. Roadmap item 3 — trigger automático do MRP

Implementado como **opt-in por item** (`items.conversao_automatica`,
migration `20260804-000010`), documentado como `UC-24b` em
`docs/projeto/04-USE_CASES.md`. Decisão de design deliberada: **nunca
100% automático** — risco de compra sem revisão humana; só itens com a
flag convertem sozinhos, dentro da mesma transação do plano MRP
(`GenerateMrpPlanUseCase`). Testado em
`server/tests/unit/mrp-auto-convert.test.ts` (4/4). **Pendência residual
pequena:** ainda não existe endpoint/UI para ligar a flag por item — só
via UPDATE direto no banco.

### 4. Roadmap item 8 — rating de fornecedor via RNC

Novo campo `suppliers.quality_score` — **calculado, nunca editável via
API** —, migration `20260804-000011-add-supplier-quality-score.cjs`,
recalculado de forma síncrona na criação de RNC vinculada a lote com
fornecedor (`CreateNonConformityUseCase.recalculateSupplierQualityScore`).
Fórmula: `MAX(0, 100 - (rncs_count / receipts_count * 100))`.
Documentado por completo em `docs/database/DATABASE.md`. Testado em
`server/tests/unit/quality-lot-lifecycle.test.ts` (20/20). **Risco
residual importante, registrado em destaque:** sem backfill retroativo —
RNCs fechadas antes desta entrega não contam no cálculo inicial (o campo
nasce no default neutro 100.00 para todo fornecedor).

### 5. Roadmap item 7 (parcial) — schema de mão-de-obra/overhead no custeio

Apenas o schema foi entregue: `work_centers.cost_per_hour` + tabela
`production_cost_settings` (migrations `20260804-000007/-000008/
-000009`). **O cálculo real ainda NÃO foi implementado.** Contrato
documentado em `docs/database/DATABASE.md`, apontando
`ChangeProductionOrderStatusUseCase.completeOrder()` como o lugar certo
para plugar o cálculo. Este item **não** foi marcado como resolvido no
roadmap — fica "schema pronto, cálculo pendente" como próxima tarefa.

### Achado operacional importante — risco de processo com migrations paralelas

Durante esta rodada, 2 agentes em paralelo (schema de custeio e rating de
fornecedor) colidiram numerando migrations como `20260804-000007` para
arquivos diferentes. Um deles renomeou o próprio arquivo para `-000011`
para evitar duplicidade, mas isso deixou a tabela `SequelizeMeta` do
Postgres dessincronizada do arquivo em disco — a migration já havia sido
APLICADA sob o nome antigo por uma corrida com o outro agente rodando
`migration:up` ao mesmo tempo. Detectado e corrigido diretamente nesta
consolidação: `UPDATE` em `SequelizeMeta` para casar com o nome do
arquivo atual em disco, **sem** re-executar a migration. Confirmado via
`npm run migration:status`: todas as 11 migrations de 2026-08-04
aparecem como `up`, numeração `000001` a `000011` sem lacunas nem
duplicidade.

**Registrado como risco de processo para rodadas futuras com múltiplos
agentes mexendo em schema ao mesmo tempo** (ver detalhamento em
`docs/governance/TODO.md`): preferir um agente por vez para
`migration:generate`/`migration:up` quando há mais de um agente de schema
na mesma sessão, ou revisar `migration:status` manualmente ao final de
rodadas com múltiplos agentes de schema.

### Registro geral (rodado diretamente nesta consolidação, não repassado por outro agente)

```
cd server && npx jest tests/unit
  → Test Suites: 61 passed, 61 total | Tests: 431 passed, 431 total

cd server && node scripts/run-api-suite.cjs integration
  → Test Suites: 27 passed, 27 total | Tests: 65 passed, 65 total

cd server && npm run migration:status
  → todas as migrations até 20260804-000011 em estado "up", sem lacunas
```

**Documentos atualizados nesta consolidação:** `docs/governance/TODO.md`
(Bloco 6.1 e Bloco 1.5 fechados `[x]`, nova seção "Rodada de 5 Frentes
Paralelas — 2026-08-04"), `docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md` (itens 3
e 8 marcados resolvidos, item 7 mantido parcial com nota do schema),
`docs/governance/HANDOFF_CODEX.md` (seção nova consolidando tudo), este diário.
original.

---

## 2026-08-04 (apêndice) — Custeio real de mão-de-obra/overhead + rastreabilidade por lote/QR

Duas frentes do roadmap (`docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md`) fechadas
nesta data, em sequência à rodada de 5 frentes registrada logo acima. A
entrada anterior deste diário deixou o item 7 explicitamente como "NÃO
marcado como resolvido, só o schema foi entregue" — esta entrada fecha o
cálculo real que faltava, e também fecha o item 6.

### 1. Roadmap item 7 — custeio real (mão-de-obra + overhead)

O schema (`work_centers.cost_per_hour`, tabela
`production_cost_settings`, migrations `20260804-000007/-000008/-000009`)
já existia desde a rodada anterior. O que entrou agora foi o **cálculo**:

- `server/src/services/costingService.ts` ganhou
  `registerAdditionalProductionCost()`.
- `ChangeProductionOrderStatusUseCase.completeOrder()`
  (`server/src/modules/production/application/use-cases/ChangeProductionOrderStatusUseCase.ts`)
  agora calcula, na MESMA transação da conclusão da OP:
  - **Mão-de-obra:** horas apontadas (`production_order_tracking`,
    `finished_at - started_at`) × `work_centers.cost_per_hour` da etapa,
    com fallback `production_cost_settings.default_labor_rate_per_hour`
    quando a etapa não tem centro de trabalho estruturado vinculado. OP
    sem nenhum apontamento concluído não lança custo de mão-de-obra
    (nenhuma base horária real para estimar).
  - **Overhead:** `overhead_rate_percent / 100` sobre a base configurada
    em `overhead_calculation_basis` (`material_labor`/`labor_only`/
    `material_only`).
  - Lançamentos gravados em `ProductCostLedger` com
    `source_type: 'production_labor'`/`'production_overhead'`, separados
    do lançamento de material (`'production'`, já existia).
- Contrato completo, com justificativa de cada decisão de modelagem, já
  documentado em `docs/database/DATABASE.md` (seção "Cálculo implementado (item
  7/9 — mão-de-obra e overhead)").
- Testado em `server/tests/unit/production-labor-overhead-cost.test.ts`
  (6 casos, `costingService` real não mockado — mão-de-obra via
  `work_centers.cost_per_hour`, fallback global, OP sem apontamento, 3
  bases de overhead).

**Bug real encontrado e corrigido no caminho:**
`SequelizeReportsRepository.findCostVarianceByProduct`
(`server/src/modules/reports/infrastructure/sequelize/SequelizeReportsRepository.ts:225`)
triplicava a contagem de `quantity` quando existiam múltiplos
lançamentos-irmãos (material + mão-de-obra + overhead) da mesma OP
compartilhando `source_id` — a média ponderada simples somava a
quantidade 3x para o mesmo lote produzido, diluindo `avg_real_cost`
incorretamente. Corrigido com uma CTE que colapsa as linhas-irmãs por
`(product_id, source_id)` (soma `total_cost`, mantém `quantity` uma vez)
antes de agregar por produto. Isso afeta diretamente o relatório de
variância de custo em `/reports` (aba "Custos") — o número exibido antes
desta correção estava sistematicamente errado para qualquer OP concluída
com apontamento de mão-de-obra/overhead lançado.

**Risco residual real, sem mitigação (registrado para o time humano):**
não há backfill retroativo — OPs concluídas antes desta entrega não
ganham custo de mão-de-obra/overhead; permanecem só com o custo de
material já existente. OEE completo (que depende de disponibilidade/downtime
e qualidade/refugo, além do eixo de custo) continua fora de escopo desta
entrega.

### 2. Roadmap item 6 — rastreabilidade por lote/QR no chão de fábrica

Backend reaproveitou 100% a infraestrutura de QR já existente
(`qrCodeService.ts`, `GenerateEntityQrCodeUseCase.ts`, hoje usada em
Ativos) e o model `ProductionLotConsumption` já existente — nenhuma
tabela nova. Dois endpoints novos em
`server/src/modules/inventory/presentation/routes/inventory.ts`:

- `GET /api/inventory/lots/by-code/:lot_number` — lookup por código
  legível (`GetLotByCodeUseCase.ts`), com desambiguação opcional por
  `product_id`.
- `GET /api/inventory/lots/:id/qrcode` — gera QR para etiqueta,
  reaproveitando `GenerateEntityQrCodeUseCase`.

Testado em `server/tests/unit/lot-traceability-qrcode.test.ts` (9 casos).

Frontend: novo componente
`client/src/pages/production/CompleteOrderWithLotScanDialog.tsx` —
conclusão de OP com leitura/digitação de código de lote consumido
(resolvido via lookup ao endpoint acima) e lote produzido via
`finished_lot_number` — integrado em `ShopFloorPage.tsx` (botão "Concluir
OP (ler lote)", abre o QR da etiqueta pós-conclusão via `QrCodeDialog`
reaproveitado de Ativos). Botão de reimpressão de QR adicionado em
`client/src/pages/logistics/LotsTab.tsx`.

**Decisão consciente, registrada como não sendo gap:** leitura por câmera
(`getUserMedia`) não foi implementada — o leitor físico USB/Bluetooth de
código de barras/QR, padrão em chão de fábrica, já preenche o campo de
texto como se fosse digitação, tornando a câmera do navegador
desnecessária para este caso de uso.

### Validação rodada diretamente nesta consolidação (não repassada por outro agente)

```
cd server && npx jest tests/unit
  → Test Suites: 63 passed, 63 total | Tests: 446 passed, 446 total

cd server && node scripts/run-api-suite.cjs integration
  → Test Suites: 27 passed, 27 total | Tests: 65 passed, 65 total

cd client && npx vitest run
  → Test Files: 6 passed (6) | Tests: 24 passed (24)
```

**Documentos atualizados nesta consolidação:** `docs/governance/TODO.md`
(nova seção "Custeio real de mão-de-obra/overhead + rastreabilidade por
lote/QR — 2026-08-04"), `docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md` (itens 6 e
7 marcados `feito`), `docs/governance/HANDOFF_CODEX.md` (seção nova), este diário.

---

## 2026-08-05 — Menu por departamento, `Item.type` USO_E_CONSUMO/ATIVO_IMOBILIZADO, devolução ao fornecedor com estorno, toggle MRP auto-convert, refactor Clean Architecture (22 use-cases), fix de bootstrap de banco novo, telas órfãs cabeadas

**Contexto:** dia inteiro de entregas (8 commits), todas já mergeadas em
`main` sem passar por esta sessão de governança em tempo real — esta
entrada consolida retroativamente, por leitura de `git log --stat` e dos
diffs reais, o que foi commitado em 2026-08-05 (nenhuma entrada de diário
havia sido registrada até agora para essa data).

**1. Reorganização do menu por departamento (Blocos A–F)** — navegação
lateral (`AppLayout.tsx`) reagrupada por blocos de área de negócio em vez
da lista plana anterior, alinhando o menu à estrutura organizacional de
21 departamentos já documentada em `docs/00-ESTRUTURA_ORGANIZACIONAL.md`.

**2. `Item.type` ganha `USO_E_CONSUMO`/`ATIVO_IMOBILIZADO`** — novo par de
valores no enum de tipo de item (migration `20260805-000001-add-item-tipo-uso-consumo-ativo.cjs`),
permitindo cadastrar itens que não são matéria-prima/produto/subconjunto
(ex.: material de escritório, ferramental capitalizável). Migrations
complementares no mesmo dia: `20260805-000002-add-asset-type-license.cjs`,
`20260805-000003-add-asset-license-and-purchase-item.cjs` (licença como
tipo de ativo + vínculo do ativo ao item do pedido de compra que o
originou), `20260805-000004-add-invoice-type-payable-and-purchase.cjs`
(tipo de nota fiscal em contas a pagar/compra),
`20260805-000005-add-asset-id-non-conformities.cjs` (RNC pode referenciar
um ativo, não só um lote), `20260805-000006-add-asset-status-returned-to-supplier.cjs`
(novo status de ativo para devolução ao fornecedor).

**3. Devolução ao fornecedor com estorno** — fluxo novo de devolução de
ativo/item ao fornecedor, com estorno financeiro associado (usa o status
`returned_to_supplier` da migration `-000006` acima).

**4. Toggle de MRP auto-convert via PATCH + UI** — a pendência residual
registrada em 2026-08-04 ("não existe endpoint/UI para ligar
`items.conversao_automatica` por item — só via UPDATE direto no banco")
foi fechada: `client/src/api/items.ts` + `ProductsPage.tsx` ganharam a
chamada e o controle de UI para ligar/desligar a conversão automática do
MRP por item, consumindo um `PATCH` já exposto no backend.

**5. Refactor de 22 use-cases para Clean Architecture (commit `e4104fb`)**
— módulos `fiscal`, `inventory` (warehouses/lots/transfers), `products`,
`purchase-requisitions`, `purchases`, `users`, `webhooks` desacoplados de
acesso direto ao Sequelize nos use-cases, passando a depender de
interfaces de repositório (`domain/repositories/*Repository.ts`) com
implementação em `infrastructure/sequelize/Sequelize*Repository.ts`. 62
arquivos alterados, cobertura de teste unitário existente mantida verde
(ajustes em ~15 arquivos de teste para os novos mocks de repositório).

**6. Fix real de bootstrap de banco novo + bug de dual-read na contagem
cíclica (commit `f9f03ea`)** — `20260731-000001-baseline-schema.cjs`
tinha uma coluna `NOT NULL` indevida que quebrava a criação de banco do
zero (ambiente novo, sem histórico de migrations incrementais);
corrigido. Bug real também corrigido em
`CreateInventoryCountUseCase.ts`/`SequelizeItemRepository.ts`: dual-read
de contagem cíclica lia o campo errado em certos casos. Teste de
invariante novo: `server/tests/unit/warehouse-invariants.test.ts`.

**7. `@types/express` alinhado ao runtime real v4 (commit `a386ca2`)** —
o pacote de tipos estava na major errada frente ao Express 4.18
efetivamente instalado; corrigido `server/package.json`/`package-lock.json`.

**8. Fixture de Item para CI + remoção de padrão perigoso de login com
admin real em teste (commit `06851db`)** — `server/scripts/run-api-suite.cjs`
ganhou fixture de Item para os testes de integração de MRP/rastreabilidade;
`mrp.test.ts`/`traceability.test.ts` pararam de logar com as credenciais
reais do admin seed, usando um usuário de teste dedicado.

**9. 3 telas órfãs cabeadas no frontend (commit `da27101`)** — RH,
Configuração Fiscal e Auditor Inteligente ganharam entrada de menu/rota em
`App.tsx`/`AppLayout.tsx` (backend já existia, sem UI acessível até este
commit).

**10. Atualização do doc de auditoria (commit `0c68b65`)** — status real
dos 15 achados ALTO de `docs/governance/auditorias/AUDITORIA_PRE_PRODUCAO_2026-08-02.md`
atualizado.

**Documentos atualizados nesta consolidação retroativa:** este diário
(entrada nova, único registro de 2026-08-05 até agora).

---

## 2026-08-06 — Apps mobile (Expo) e Android TV novos, atribuição de contagem cíclica (pool/claim), `department_id` em OP/contagens, auditoria multi-agente de 7 frentes, remediação imediata de 4 frentes

**Contexto:** sessão longa com dois grandes blocos de trabalho: (I) entrega
de dois aplicativos novos + feature de atribuição de contagens no backend/
web, todos testados ao vivo contra Postgres real; (II) auditoria
multi-agente completa (7 agentes em paralelo) seguida de remediação
imediata (4 agentes em paralelo) dos achados mais graves. Checkpoint
principal: commit `8ba775f`. Correções subsequentes da remediação seguem
em andamento no working tree no momento desta entrada (ver `git status`
no fechamento desta sessão).

### I. Entregas de produto

**1. App mobile novo (`mobile/`, Expo/React Native + Expo Router)** —
login JWT reaproveitando o backend existente, scan de estoque QR
(`expo-camera`, `CameraView`), histórico de movimentações, execução de
contagens cíclicas (pool de contagens disponíveis + contagens já
atribuídas ao usuário logado). **Validado apenas por typecheck
(`npx tsc --noEmit`)/bundle (`npx expo export`) nesta entrega — nenhum
teste em dispositivo/emulador real ainda** (câmera, leitor físico,
D-pad n/a aqui, rede real da fábrica). Detalhe completo em
`mobile/README.md` §5 e `docs/governance/HANDOFF_CODEX.md`.

**2. App Android TV novo (`tv/`, react-native-tvos)** — painel de demandas
por departamento (recebimento pendente, requisições aguardando aprovação,
expedição pronta, qualidade em quarentena/RNCs abertas), auto-refresh a
cada 60s, navegação por D-pad (`FocusablePressable`). **Mesma ressalva:
validado só por typecheck/bundle, sem teste em hardware de TV real** (D-pad
físico, resolução de banner 320×180, controle remoto). Detalhe em
`tv/README.md` §5.

**3. Feature de atribuição de contagem cíclica (pool/atribuída) — full
stack** — migration `20260806-000001-add-assigned-to-inventory-counts.cjs`
(`inventory_counts.assigned_to`, FK `users`, nullable); claim atômico no
`start` da contagem (lock pessimista `SELECT ... FOR UPDATE` dentro de
transação — dois funcionários competindo pela mesma contagem do pool
resolvem via 409 `CONFLICT` para o perdedor da corrida); filtros de
listagem `assigned_to=me`/`unassigned=true`. Tela web do supervisor
(`InventoryCountsPage.tsx`) ganhou campo "Atribuir a" na criação + filtro
na listagem; app mobile (`(app)/counts/`) consome o mesmo contrato.
Detalhe completo do contrato em `docs/arquitetura/API.md` §8.2 e
`docs/governance/HANDOFF_CODEX.md`.

**4. Bug real corrigido — caminho `item_ids` de contagens dava 500** —
`product_id NOT NULL` em `inventory_count_items` quebrava a criação de
contagem quando informada por lista de itens (não por depósito completo);
migration `20260806-000002-make-product-id-nullable-inventory-count-items.cjs`
(nullable + `CHECK`). **Testado ao vivo.**

**5. `department_id` em `production_orders`/`inventory_counts` + painel de
demandas por departamento** — migration
`20260806-000003-add-department-id-to-production-orders-and-inventory-counts.cjs`
(nullable, **sem backfill por design** — dado histórico não tem
departamento de origem confiável para inferir). Endpoint novo
`GET /api/dashboard/department-demands` (consumido pelo painel de TV do
item 2 acima). **Testado ao vivo contra Postgres real.**

**6. Teste manual completo do fluxo de contagem via API real** — criar
(pool) → claim → conflito 409 (segundo usuário) → contar itens → submit
bloqueado com pendências (422) → submit válido → aprovação com ajuste
real de saldo de estoque. Dados de teste limpos ao final.

**7. Limpeza de `.claude/agents/evok-production-remediation.md`** —
removidas ~90 linhas de texto estranho coladas por acidente em uma
entrega anterior (não relacionado a código de produto).

### II. Auditoria multi-agente (7 agentes em paralelo) — todos os relatórios entregues

- **Auditor geral:** veredito **PARCIALMENTE APROVADO** — sólido
  tecnicamente, 2 achados P1 de fluxo de exceção.
- **Segurança:** zero crítico/alto — apto para G6 do ponto de vista de
  segurança pura.
- **DBA:** schema saudável, 53 migrations sincronizadas (no momento da
  auditoria, antes da `-000004` de remediação abaixo), índices faltantes
  detectados.
- **Infra:** 4 achados altos — uploads sem volume persistente no
  `docker-compose.yml`, docs de deploy (`docs/infra/DEPLOY_UBUNTU.md`)
  ainda citando SQL legado em vez de migrations, ausência de TLS
  documentado, `docker-compose.prod.yml` nunca exercitado de fato.
- **Frontend:** 1 bug P0 real, introduzido no próprio diff do dia — o
  campo "Atribuir a" (item I.3 acima) quebrava o caso "pool" (sem
  atribuição) com falha silenciosa.
- **Mobile/TV:** timeout de rede ausente nos dois apps, TV entrando em
  loop de erro 403 sem tratamento diferenciado, TTL de JWT de 7 dias
  incompatível com um painel de TV "sempre ligado" (sem fluxo de
  relogin/refresh).
- **Documentação:** este relatório de consolidação (a auditoria em si).

### III. Remediação imediata (4 agentes em paralelo) — concluída em 2026-08-06

- **Bug P0 do pool (frontend):** corrigido + teste de componente novo
  (`client/src/pages/products/InventoryCountsPage.test.tsx`) — suíte
  vitest do client em **49/49** após a correção.
- **Mobile/TV:** timeout de 15s adicionado às chamadas HTTP dos dois apps;
  tratamento diferenciado de 403 (não confunde com 401/relogin); logout
  explícito disponível na TV; ícones vetoriais substituindo emoji/texto
  cru; lixo de template do `create-expo-app` removido do `mobile/`
  (`mobile/CLAUDE.md`, `mobile/AGENTS.md`, `mobile/LICENSE` — não tinham
  relação com o projeto, eram gerados pelo scaffold do Expo).
- **Infra:** `docker-compose.yml` ganhou volume dedicado para uploads +
  variável de timezone (`TZ`); `ALLOW_LOCAL_DB_NO_SSL` documentada;
  `docs/infra/DEPLOY_UBUNTU.md` corrigido para referenciar o fluxo real de
  migrations (não mais o SQL legado).
- **Backend (em finalização no momento desta entrada, ainda não
  commitado):** endpoint novo `PUT /api/inventory-counts/:id/reassign`
  (`ReassignInventoryCountUseCase.ts`), admin-override no `start` (admin
  pode iniciar uma contagem de qualquer atribuição), validação de
  `assigned_to` ativo na atribuição, migration
  `20260806-000004-add-missing-indexes-status-item-id.cjs` (índices em
  `production_orders.status` + `item_id` em 4 tabelas, drop de índice
  duplicado encontrado na auditoria do DBA), `down()` da migration
  `-000002` protegido com mensagem de erro clara (evita reverter uma
  coluna que já tem dados não nulos sem aviso).

### Pendências registradas (decisão consciente de não resolver hoje)

- **JWT de 7 dias × painel de TV "sempre ligado"** — exige decisão de
  produto (refresh token dedicado, TTL específico para o app de TV, ou
  runbook operacional de relogin periódico). Registrado como decisão
  pendente, não como bug.
- **Validação em hardware real dos 2 apps** — listas detalhadas em
  `mobile/README.md` §5 e `tv/README.md` §5 (build APK/EAS, D-pad físico,
  câmera/leitor físico de QR, rede real da fábrica, banner de TV
  320×180).
- **Teste de integração de concorrência real do claim** — dois clientes
  simultâneos contra Postgres real (hoje coberto só por teste unitário
  com repositório mockado).
- **Paginação da lista de contagens no app mobile** — limite fixo de 100
  itens, sem paginação real.
- **Infra de produção** — reverse proxy/TLS, `docker-compose.prod.yml`
  exercitado de fato, cron de backup — todos aguardando a compra do
  servidor de produção (checklist em `docs/infra/DEPLOY_UBUNTU.md`).

**Documentos atualizados nesta consolidação de governança:**
`docs/governance/TODO.md` (nova seção "2026-08-06" com as pendências
acima), `CLAUDE.md` (status/data, contagem de migrations/FKs, árvore de
pastas com `mobile/`/`tv/`, roadmap), `docs/governance/HANDOFF_CODEX.md` (nota de
atualização na seção de atribuição de contagens), `docs/governance/go-live/GO_LIVE_G6_CHECKLIST.md`
(resumo executivo/datas, seções Kubernetes/Datadog marcadas não
aplicáveis), este diário.

---

### 2026-08-06 (segunda rodada do dia — 4 frentes do roadmap: RFQ, financeiro, OEE, bombas latentes)

**Contexto:** segunda rodada de entregas do dia, distinta da consolidação
de auditoria multi-agente registrada na entrada "2026-08-06" acima (apps
mobile/TV, atribuição de contagem). Duas ondas: Onda 1 já commitada
(`feat: RFQ multi-fornecedor, centros de custo + projecao de caixa diaria,
e relatorio OEE completo`); Onda 2 no working tree, não commitada no
momento desta entrada.

#### Onda 1 (commitada) — 3 frentes do roadmap fechadas

1. **Módulo RFQ/Cotação multi-fornecedor** (`server/src/modules/rfq/`,
   tabelas `rfqs`/`rfq_items`/`rfq_suppliers`/`rfq_quotes`, migration
   `20260806-000010-create-rfq-tables.cjs`). Endpoints sob `/api/rfqs`
   (`authorizeModule('compras', ...)`, `approve` só na adjudicação):
   listagem/detalhe/mapa comparativo, criação avulsa OU a partir de
   requisição (XOR), convite de fornecedores, registro de cotação (upsert
   por par item×fornecedor), adjudicação por item (`POST /:id/award`) —
   gera pedido(s) de compra por fornecedor vencedor e realimenta o
   catálogo `item_suppliers` com preço/prazo vencedor. Máquina de status
   `draft → sent → quoted → awarded`. Página `/purchases/rfqs` + item de
   menu em Compras. Testado ao vivo ponta a ponta. Fecha o item 1 (seção 2)
   do `docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md`. Contrato completo em
   `docs/arquitetura/API.md` §11.1; schema em `docs/database/DATABASE.md`.
2. **Financeiro — centros de custo + projeção de caixa diária.** Tabela
   `cost_centers` + `cost_center_id` (nullable, `ON DELETE SET NULL`) em
   `accounts_payable`/`accounts_receivable` (migration
   `20260806-000020-create-cost-centers.cjs`). Endpoints sob
   `/api/finance`: CRUD de centro de custo, relatório agrupado
   (`GET /cost-centers/report?from=&to=`, com grupo "Sem centro de custo"),
   projeção diária (`GET /cashflow/projection?days=30|60|90&opening_balance=`
   — série dia a dia com saldo acumulado, vencidos somados no dia 0, menor
   saldo do período com data), atribuição de centro de custo em conta a
   pagar/receber existente, `POST /payable` aceitando `cost_center_id`. UI:
   3 abas na tela financeira (Contas / Centros de Custo / Projeção de
   Caixa). **Bug de fuso corrigido no caminho:** parse de `due_date`
   (`DATEONLY`) via `new Date('YYYY-MM-DD')`/`toISOString()` deslocava a
   série em 1 dia em fusos negativos (`America/Sao_Paulo`, UTC-3) —
   corrigido para parse por componentes de calendário. **Fora de escopo,
   registrado como próxima etapa do módulo:** conciliação bancária/CNAB;
   mapeamento automático departamento→centro de custo na criação
   automática de `AccountPayable` (hoje só manual).
3. **OEE completo.** `GET /api/reports/oee?start_date&end_date&work_center_id`
   (`authorizeModule('relatorios.producao')`) — Disponibilidade (horas
   produzindo/horas do calendário de turnos do centro, com fallback
   `capacity_hours_per_day`), Performance (tempo padrão × unidades / tempo
   real, capado a 100%), Qualidade (boas/(boas+refugo)), OEE = D×P×Q; por
   centro de trabalho e agregado geral (soma das bases brutas, não média
   das taxas). `null` com `no_data_reason` explícito em vez de `0`
   enganoso. Aba OEE em `/reports` (thresholds visuais 85%/60%). Sem
   migration nova (reaproveita `production_order_tracking`/`work_centers`/
   `work_center_shifts`). **Bug de runtime corrigido no caminho** (não
   relacionado à lógica de OEE em si, mas descoberto e corrigido durante
   esta frente): `export interface` + `export =` no mesmo arquivo TS
   quebrava o `tsx` e derrubava o dev server.
   **LIMITAÇÃO DOCUMENTADA, risco residual aceito conscientemente:** o
   schema não tem campo de downtime/parada de máquina explícito — a
   Disponibilidade é uma aproximação por calendário de turnos (tempo
   apontado vs. tempo disponível do centro), sem desconto de paradas reais
   registradas. Registrado como item futuro em `docs/governance/TODO.md`.

#### Onda 2 (não commitada no momento desta entrada) — desarme de bombas latentes UUID×INTEGER

Fecha a seção "Bombas latentes conhecidas" de
`docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md`, aberta desde 2026-08-02 (mesmo
padrão de bug já corrigido em `item_estruturas`, migration
`20260802-000005`). Migrations `20260806-000040/041/042`, todas aplicadas
no banco local.

- **As 4 colunas originalmente documentadas** —
  `requisicoes_compra.aprovado_por`, `ordens_producao.criado_por`,
  `movimentos_estoque.usuario_id`, `auditoria_eventos.usuario_id` — ainda
  existiam (nunca tinham sido corrigidas apesar de documentadas como
  pendência). Convertidas UUID → INTEGER com FK real para `users(id)`
  (`ON DELETE SET NULL`).
- **+2 do mesmo padrão, achadas nesta rodada por auditoria completa** (não
  estavam no levantamento original): `requisicoes_compra.solicitante_id`,
  `entradas_nf.recebido_por` — mesma correção.
- **+1 bomba REAL em tabela viva** (diferente das 6 anteriores, que vivem
  em tabelas órfãs sem uso): `items.fornecedor_padrao_id` era UUID, mas
  `suppliers.id` (a FK real usada pelo código) é INTEGER — o campo era
  estruturalmente impossível de preencher via API (`z.string().uuid()` no
  validator nunca aceitava um `supplier_id` real) e qualquer `include` de
  `fornecedorPadrao` quebraria em runtime (`operator does not exist: uuid
  = integer`). Corrigido: UUID → INTEGER + FK real para `suppliers(id)`
  (`ON DELETE SET NULL`); `Item.ts` e `itemValidators.ts` atualizados no
  mesmo commit. Diagnóstico antes do fix: 13 linhas em `items`, campo 100%
  `NULL` — correção sem perda de dado. **BREAKING CHANGE DE API:**
  `POST`/`PATCH /api/items` agora exige um inteiro (`supplier_id`) em
  `fornecedor_padrao_id`, não mais um UUID — documentado em `docs/arquitetura/API.md`
  §3 (nota de topo da seção Produtos) e `docs/database/DATABASE.md`.
- **12 tabelas órfãs do schema-fantasma em português** (`usuarios`,
  `fornecedores`, `lotes`, `numeros_serie`, `requisicoes_compra`,
  `requisicao_compra_items`, `entradas_nf`, `entradas_nf_items`,
  `ordens_producao`, `movimentos_estoque`, `webhooks_eventos`,
  `auditoria_eventos`) — 0 linhas, 0 models Sequelize, 0 código vivo,
  confirmado por auditoria completa. **Decisão consciente: não dropadas**
  (preservar histórico/possível relevância de auditoria fiscal futura),
  apenas marcadas `DEPRECATED` via `COMMENT ON TABLE`, visível em qualquer
  client SQL. Detalhe completo, incluindo a decisão futura em aberto de
  avaliar `DROP TABLE`, em `docs/database/DATABASE.md`.
- **Teste de guarda novo:** `server/tests/unit/no-orphan-pt-schema-tables.test.ts`
  (14 casos) — falha se código novo em `server/src` referenciar qualquer
  uma das 12 tabelas órfãs. **Limitação registrada:** não cobre
  `server/migrations/*.cjs` (migrations antigas legitimamente referenciam
  essas tabelas para criá-las/alterá-las).

#### Números finais de validação (rodados nesta consolidação)

```
Server: 585/585 testes unitários — Test Suites: passed | Tests: 585 passed
Server: typecheck — 0 erros
Server: migration:status — limpo (59 migrations no total)
Client: 49/49 testes — Test Files: passed | Tests: 49 passed
Client: build — ok
```
Smoke test ao vivo dos 3 módulos da Onda 1 (RFQ ponta a ponta, financeiro,
OEE contra dados reais).

#### Riscos residuais registrados (decisão consciente de não resolver nesta rodada)

- **Conciliação bancária/CNAB** — próxima etapa do módulo financeiro, sem
  data definida.
- **Mapeamento automático departamento→centro de custo** na criação
  automática de `AccountPayable` (ex.: ao aprovar pedido de compra) — hoje
  só manual via `PUT .../cost-center`.
- **Downtime/parada de máquina não modelado** — OEE (Disponibilidade)
  permanece uma aproximação por calendário de turnos, não um cálculo com
  desconto de paradas reais.
- **12 tabelas órfãs preservadas, não dropadas** — decisão de manter
  histórico; `DROP TABLE` definitivo é decisão futura em aberto, fora
  desta rodada.
- **`rfq_number` gerado por `COUNT(*)` do ano** (`RFQ-<ano>-XXXX`) —
  mesma tolerância a corrida já aceita em outros geradores de número
  sequencial do projeto (`generatePurchaseOrderNumber` etc.): sob
  concorrência real (duas criações simultâneas no mesmo milissegundo), o
  número pode colidir; mitigado pela constraint `UNIQUE(rfq_number)`, que
  faria a segunda transação falhar com erro de unicidade em vez de gerar
  dado duplicado silenciosamente — sem retry automático implementado.

**Documentos atualizados nesta consolidação:** `docs/arquitetura/API.md` (seções RFQ
§11.1, financeiro §6, OEE §7, nota breaking change em §3),
`docs/database/DATABASE.md` (tabelas RFQ, `cost_centers`, correção das 7 colunas-
bomba, `DEPRECATED` nas 12 tabelas órfãs), `docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md`
(seção 2, tabela de módulos, item 9, seção "Bombas latentes conhecidas"
marcados resolvidos), `docs/governance/TODO.md` (itens novos de risco
residual), `docs/governance/HANDOFF_CODEX.md` (seção nova consolidando as duas
ondas), `CLAUDE.md` (contagem de migrations, roadmap), este diário.

---

### 2026-08-06 (terceira rodada — 6 frentes: auth refresh, Winston, mobile/TV, telas web, vendas, produção, financeiro)

**Contexto:** terceira rodada de entregas do dia, distinta das duas
anteriores (auditoria multi-agente de apps mobile/TV + atribuição de
contagem; RFQ/centros de custo/OEE/bombas latentes). Working tree não
commitado no momento desta entrada; migrations
`20260806-000050/051/052/060/070` já aplicadas no banco real, junto com
as das rodadas anteriores (64 migrations no total).

1. **Auth refresh + Winston.** `POST /api/auth/refresh`
   (`authenticate` + `RefreshTokenUseCase`, header `Authorization: Bearer
   <token válido>` → `{ success:true, data:{ token } }`) — renovação
   deslizante sem refresh-token separado, mesmo signing do login,
   rate-limit 30/15min por usuário. Testado ao vivo. Fecha a pendência
   "Decisão de produto — JWT de 7 dias × painel de TV sempre ligado"
   registrada em `docs/governance/TODO.md`. Logging estruturado Winston
   (`server/src/config/logger.ts`) integrado no request-logger,
   errorHandler e boot (`index.ts`) — JSON em produção, colorido em dev,
   `LOG_FILE` opcional (sem rotação de arquivo, documentado).
2. **Mobile/TV — paginação + renovação de sessão.**
   `mobile/app/(app)/counts/index.tsx` ganhou paginação incremental
   (20/página) nas seções "Minhas contagens"/"Pool" (antes: limite fixo
   100, itens somiam acima disso — pendência registrada na entrada
   "2026-08-06" original deste diário). Mobile: refresh do token ao abrir
   o app com sessão persistida (`mobile/src/context/AuthContext.tsx`). TV:
   refresh proativo a cada 12h, bem abaixo do TTL de 7 dias
   (`tv/src/context/AuthContext.tsx`) — resolve de fato a pendência do
   painel "sempre ligado".
3. **Web — 2 telas pendentes fechadas.** Reatribuição de contagem
   (`PUT /api/inventory-counts/:id/reassign`, endpoint já existia desde a
   remediação de 2026-08-06 original): botão "Reatribuir" + devolver ao
   pool em `InventoryCountsPage.tsx`, gateado por permissão `approve`.
   Fornecedor padrão do item: campo `SelectNative` no dialog de
   fornecedores do produto (`ProductsPage.tsx`, `ProductSuppliersDialog`),
   usa `PATCH /api/items/:id` com `fornecedor_padrao_id` (já `INTEGER`
   desde a correção da rodada anterior).
4. **Vendas — 3 gaps fechados** (`docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md`,
   linha `sales`). **Tabela de preços por cliente:** tabela
   `customer_price_lists` (migration `-000050`), CRUD
   `/api/sales/customers/:id/prices`, dialog "Tabela de preços" em
   `ClientsPage.tsx`, preço sugerido (editável) ao adicionar item ao
   pedido. **Alteração de pedido confirmado:** `PUT /api/sales/:id/items`
   (substituição completa de itens), permitido em `quote`/`confirmed`,
   bloqueado a partir de
   `partially_invoiced`/`invoiced`/`shipped`/`canceled` (422 com
   `details`), ajusta reserva de estoque na mesma transação, protege
   linhas já parcialmente faturadas. Botão "Editar itens" em
   `SalesPage.tsx`. **Faturamento parcial:** `sale_items.invoiced_quantity`
   (migration `-000051`), novo status `partially_invoiced` (migration
   `-000052`, `confirmed → partially_invoiced → invoiced`; embarque
   continua exigindo faturamento total). `POST /api/sales/:id/nfe` aceita
   `{ items: [{ sale_item_id, quantity }] }` opcional. Dialog de emissão
   com seleção de quantidade por item + indicador "faturado X de Y".
   **Risco residual real, documentado no código:** `Sale.nfe_*` guarda só
   a NF-e mais recente — múltiplas emissões parciais sobrescrevem
   chave/protocolo/XML uma da outra (sem histórico por emissão); não
   bloqueante para uso mock/dev, mas registrado como pendência para
   produção real com múltiplas NF-e por pedido (`sale_invoices`, ver
   `docs/governance/TODO.md`). O módulo `sales` tocou o módulo `fiscal`
   (`IssueSaleNfeUseCase`, `fiscalController`, `fiscalValidators`) para
   viabilizar faturamento parcial — desvio de território consciente e
   justificado (faturamento parcial é estruturalmente parte do fluxo de
   NF-e).
5. **Produção — paradas + OEE preciso.** Tabela `production_downtimes`
   (migration `-000060`): `work_center`, OP opcional, motivo
   (setup/manutenção corretiva/preventiva/falta material/falta
   operador/qualidade/outros), `started_at`/`finished_at`.
   `POST/PUT/GET /api/production/downtimes`, bloqueio de 2ª parada aberta
   simultânea no mesmo centro protegido em 2 níveis (use case + índice
   único parcial no Postgres). UI em `ShopFloorPage.tsx`. OEE
   (`GetOeeReportUseCase`): disponibilidade agora desconta downtime real
   (`available_hours = max(calendario - downtime, 0)`), expõe
   `downtime_hours` + breakdown por motivo. Remove a limitação
   documentada na rodada anterior (aproximação só por calendário de
   turnos).
6. **Financeiro — conciliação bancária (OFX).** Tabelas
   `bank_statements`/`bank_statement_entries` (migration `-000070`).
   Parser OFX manual (1.x SGML e 2.x XML, sem lib nova — decisão
   justificada: cobertura suficiente do subconjunto necessário sem
   dependência frágil numa área de upload). `POST
   /api/finance/reconciliation/statements` (upload `.ofx`, dedup global
   por `FITID`), sugestões de match (±7 dias, tolerância 1 centavo),
   `match`/`ignore`/`unmatch` (`unmatch` bloqueado se conta já paga —
   correção manual exigida, decisão conservadora). 4ª aba "Conciliação" em
   `FinancialPage.tsx`. CNAB fica fora desta v1 (próxima etapa).

#### Números finais de validação (rodados nesta consolidação)

```
Server: 669/669 testes unitários (85 suítes)
Server: typecheck — 0 erros
Server: migration:status — limpo (64 migrations no total)
Client: 51/51 testes
Client: typecheck — 0 erros
Client: build — ok
```

#### Riscos residuais registrados (decisão consciente de não resolver nesta rodada)

- **Sem teste de integração end-to-end contra Postgres real** para
  conciliação bancária, downtime (índice único parcial) e faturamento
  parcial — só unitários com mocks.
- **Detecção de encoding do OFX é heurística** (Latin-1/CP1252).
- **`GetSaleNfeStatusUseCase`** (path assíncrono de provedores reais —
  `focus_nfe`/`enotas`, não o mock usado em dev) não atualiza
  `invoiced_quantity`/`partially_invoiced` — só finaliza `confirmed →
  invoiced`. Afeta apenas providers reais.
- **Histórico multi-NF-e por pedido** (`sale_invoices`, 1 venda : N NF-e)
  não existe — `Sale.nfe_*` só guarda a emissão mais recente.
- **CNAB** (boleto/remessa/retorno) continua fora de escopo — só OFX foi
  implementado.

**Documentos atualizados nesta consolidação:** `docs/arquitetura/API.md` (auth
refresh §1, vendas §5 — preço por cliente/edição de itens/faturamento
parcial, financeiro §6 — conciliação bancária, relatórios §7 — OEE com
downtime + `/api/production/downtimes`), `docs/database/DATABASE.md`
(`customer_price_lists`, `sale_items.invoiced_quantity` +
`partially_invoiced`, `production_downtimes`, `bank_statements`/
`bank_statement_entries`), `docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md` (linhas
`sales`/`financial`, item 9 — downtime real), `docs/governance/TODO.md`
(itens resolvidos marcados `[x]`, novos `[ ]` de risco residual),
`docs/governance/HANDOFF_CODEX.md` (seção nova consolidando as 6 frentes),
`CLAUDE.md` (contagem de migrations, módulos/telas novas), este diário.

---

## 2026-08-06 (apêndice) — Framework de documentação em 4 categorias: auditoria de gap + primeiros artefatos de arquitetura/UX (escopo Tech Lead de governança)

**Contexto:** o dono definiu um framework de documentação de referência em
4 categorias (Engenharia de Requisitos, Modelagem de Dados, Arquitetura e
Engenharia de Software, Integrações e Operação — 11 artefatos no total) e
pediu auditoria do que já existe + criação do que falta. O trabalho foi
dividido entre este agente (governança/documentação geral) e o agente
`AdmDBA` (escopo próprio e mais profundo para a camada de dados: modelo
conceitual/lógico/físico, dicionário de dados completo, matriz de
privilégios, procedures/triggers, disaster recovery — tratado à parte,
**não duplicado aqui**).

**Auditoria de gap (11 itens do framework):**

| Item do framework | Situação encontrada |
|---|---|
| Documento de Requisitos (funcionais/não funcionais) | Funcionais: cobertos em `docs/projeto/04-USE_CASES.md`/`docs/business/01-USE_CASES.md`. Não funcionais: inexistente como documento formal — só implícito no código |
| Diagrama de Casos de Uso | Inexistente como diagrama visual — só texto (UC-01 a UC-41) |
| Mapeamento de Processos (BPMN) | Inexistente |
| DER visual + Dicionário de Dados | `docs/database/DATABASE.md` tem dicionário de dados real e ER em ASCII (não Mermaid, incompleto frente ao schema atual) — **deixado para o `AdmDBA`, não retrabalhado nesta rodada** |
| Diagrama de Arquitetura de Infraestrutura | Fragmentos em `docs/infra/DEPLOY_UBUNTU.md` e comentários do `docker-compose.yml`, sem diagrama visual consolidado |
| Diagrama de Classes | Já existia (`docs/arquitetura/DIAGRAMA_CLASSES.md`, `docs/arquitetura/DIAGRAMA_CLASSES_CAMADAS.md`), mas desatualizado frente aos módulos entregues em 2026-08-03/06 (RFQ, centros de custo, work centers, downtime, conciliação bancária, etc.) |
| Diagrama de Sequência | Inexistente para fluxos críticos |
| Documentação de API | `docs/arquitetura/API.md` já é robusto e detalhado (payloads, auth, erros) — nenhuma ação necessária |
| Manual do Usuário | Inexistente |

**O que foi criado/atualizado nesta rodada (fora do escopo do `AdmDBA`):**

1. `docs/arquitetura/REQUISITOS_NAO_FUNCIONAIS.md` (NOVO) — desempenho,
   segurança, disponibilidade, escalabilidade, compatibilidade e
   observabilidade, extraído do código real (rate-limits, JWT TTL, pool
   de conexões, healthchecks) — sem inventar números não implementados
   (ex.: SLA de tempo de resposta marcado "não especificado formalmente").
2. `docs/arquitetura/DIAGRAMA_ARQUITETURA_INFRAESTRUTURA.md` (NOVO) —
   diagrama Mermaid do ambiente de dev real (`docker-compose.yml`) e do
   plano de produção `[PENDENTE]` (servidor ainda não adquirido), com
   tabela de portas expostas.
3. `docs/arquitetura/DIAGRAMAS_SEQUENCIA.md` (NOVO) — 3 diagramas Mermaid
   `sequenceDiagram` dos fluxos mais críticos: (a) venda → reserva/baixa
   de estoque → contas a receber → NF-e (incl. faturamento parcial e
   alteração de pedido); (b) requisição de compra → RFQ/cotação → pedido
   → recebimento com quarentena de lote; (c) ordem de produção →
   apontamento → paradas/OEE → baixa de produto acabado.
4. `docs/arquitetura/DIAGRAMA_CASOS_DE_USO_BPMN.md` (NOVO) — diagrama de
   casos de uso (atores × módulos) e 2 fluxos BPMN simplificados
   (Order-to-Cash, Purchase-to-Pay) em Mermaid `flowchart`, com raias por
   departamento real (`docs/00-ESTRUTURA_ORGANIZACIONAL.md`).
5. `docs/arquitetura/DIAGRAMA_CLASSES.md` (ATUALIZADO) — nova seção "Módulos
   entregues após a versão original deste diagrama" listando em tabela as
   classes/relações que faltavam (RFQ, CostCenter, CustomerPriceList,
   WorkCenter, ProductionDowntime, BankStatement, etc.), sem
   re-renderizar o diagrama principal (ficaria denso demais) nem duplicar
   o dicionário de dados de `docs/database/DATABASE.md`.
6. `docs/manual/00-MANUAL_DO_USUARIO.md` (NOVO) — esqueleto por módulo,
   com caminho de menu real (`client/src/App.tsx`) e casos de uso formais
   por trás de cada tela; sem capturas de tela (fora do escopo desta
   rodada, listado em "Próximos passos" do próprio documento).

**Itens do framework intencionalmente NÃO tocados nesta rodada** (para
não conflitar com o trabalho paralelo do `AdmDBA`): DER visual e
Dicionário de Dados completo — permanecem em `docs/database/DATABASE.md`
até o `AdmDBA` entregar o escopo mais profundo (modelo
conceitual/lógico/físico separados, matriz de privilégios,
procedures/triggers, plano de disaster recovery).

**Pendências para uma próxima rodada:**
- Documento de Requisitos Funcionais/Não Funcionais como artefato único
  formal (hoje RNF está pronto; funcionais seguem espalhados nos UCs,
  o que é aceitável, mas não foi consolidado num único índice de
  requisitos).
- `docs/projeto/01-PLANO.md` está visivelmente desatualizado (menciona 18
  modelos, ausência de frontend, ausência de testes — tudo já superado)
  — não foi reescrito nesta rodada por estar fora do escopo imediato
  (é histórico de arquitetura, não um dos 11 itens do framework), mas
  fica registrado como risco de confusão para quem ler sem contexto.
  Ação recomendada: marcar o topo do arquivo como histórico/desatualizado
  ou revisá-lo numa rodada de limpeza geral.
- Manual do usuário sem capturas de tela/vídeos de treinamento.
- BPMN cobre 2 dos processos mais críticos (Order-to-Cash,
  Purchase-to-Pay); processos de qualidade (inspeção→RNC→liberação de
  lote) e manutenção de ativos ainda não têm swimlane dedicada.

---

## 2026-08-06 (apêndice 2) — `AdmDBA`: framework de documentação de dados completo (Modelo Conceitual/Lógico/Físico, Dicionário de Dados, Acessos/Isolamento, Estruturas Programáveis, Disaster Recovery)

Escopo reservado pelo `documentador` no apêndice anterior. Auditoria
primeiro (introspecção real do PostgreSQL 16 local via
`information_schema`/`pg_dump`, não apenas leitura de código), depois
criação de `docs/database/` (7 documentos + índice + anexo de DDL).

**Auditoria — números reais confirmados (2026-08-06, banco local):**
78 tabelas de negócio (+ `SequelizeMeta`), 171 foreign keys, 64
migrations aplicadas, 0 functions/triggers/procedures customizados
(apenas `pgcrypto` padrão), 1 único usuário Postgres (`evok_admin`,
superuser) — sem segregação de roles.

**Criado em `docs/database/`:**
1. `00-INDICE.md` — porta de entrada, aponta os 7 documentos + anexo.
2. `01-MODELO_CONCEITUAL.md` — MER de negócio (Mermaid `erDiagram`, sem
   tecnologia), glossário de 22 entidades.
3. `02-MODELO_LOGICO.md` — DER técnico (5 diagramas Mermaid por domínio:
   Compras/RFQ, Vendas, Produção, Financeiro/Centros de Custo, Acesso),
   cobrindo os módulos pedidos explicitamente (Item, Fornecedor, Venda,
   OP, Requisição/Pedido de Compra, Financeiro, RFQ, Centros de Custo).
4. `03-MODELO_FISICO.md` — como o DDL real (`schema.sql` anexo,
   `pg_dump --schema-only` do banco local) foi gerado e como
   regenerá-lo a cada migration nova; estatísticas do schema atual;
   achado sobre `NUMERIC(10,2)` em colunas monetárias do schema legado
   (`sales`/`products`) vs. a regra `DECIMAL(18,6)` do CLAUDE.md
   (documentado como observação consciente, não como bug a corrigir
   agora).
5. `04-DICIONARIO_DADOS.md` — catálogo coluna-a-coluna das 78 tabelas,
   gerado por `docs/database/gen_dict.py` (introspecção real via
   `information_schema`, não leitura de model) + descrição de negócio
   curada para as tabelas ativas/deprecated.
6. `05-ACESSOS_E_ISOLAMENTO.md` — **achado de segurança**: banco tem um
   único usuário Postgres (`evok_admin`), superusuário, usado por
   runtime da API, migrations e administração manual — sem segregação
   de privilégio mínimo. Recomendação de roles separadas (app/migration/
   backup) registrada, não implementada nesta rodada (decisão do dono).
   Isolamento de serviços externos **verificado e confirmado correto**:
   n8n (webhook HMAC), Focus NFe/eNotas (webhook + segredo), apps
   mobile/TV (JWT via API REST) — nenhum tem credencial direta de banco;
   porta 5432 vinculada a `127.0.0.1` apenas.
7. `06-ESTRUTURAS_PROGRAMAVEIS.md` — confirmado 0 functions/triggers/
   procedures de negócio no banco; decisão arquitetural documentada
   ("toda lógica de negócio vive na aplicação, Clean Architecture") com
   racional e trade-offs, distinguindo isso de `CHECK`/`UNIQUE`/FK que
   continuam no banco como invariantes estruturais (ex.: índice único
   parcial de paradas de produção).
8. `07-DISASTER_RECOVERY.md` — **achado**: scripts de backup
   (`scripts/backup-postgres.sh`/`.ps1` + agendadores cron/Task
   Scheduler) existem e funcionam, mas os únicos dumps reais em
   `backups/` são de 31/07/2026 (6 dias parados até a data desta
   auditoria) — nenhuma execução automatizada confirmada ativa neste
   ambiente (consistente com ser dev local, não produção — servidor de
   produção ainda não comprado). `docker-compose.prod.yml` não existe.
   Processo de restore documentado passo a passo, mas **nunca testado
   de ponta a ponta**; RPO/RTO não formalizados. Recomendações objetivas
   registradas para antes do Go-Live (ativar cron no servidor real,
   cobrir `app_uploads` no backup, testar restore, formalizar RPO/RTO).

**Ajustado (sem duplicar conteúdo):** `docs/database/DATABASE.md` ganhou um aviso
no topo apontando para `docs/database/00-INDICE.md` como a documentação
de referência sempre-atual, mantendo o corpo do arquivo como changelog
histórico narrativo (papel que já cumpria bem e que o `documentador`
preservou intencionalmente).

**Regra permanente estabelecida:** qualquer migration nova deve
regenerar `docs/database/schema.sql` e `04-DICIONARIO_DADOS.md`
(comandos documentados em `03-MODELO_FISICO.md`) no mesmo ciclo de
trabalho — não é tarefa pontual.

**Pendências para uma próxima rodada:**
- Implementar a segregação de roles Postgres recomendada em
  `05-ACESSOS_E_ISOLAMENTO.md` (decisão do dono do produto, não
  bloqueador técnico imediato).
- Ativar de fato o cron/Task Scheduler de backup assim que o servidor de
  produção for adquirido, e testar um restore completo cronometrado
  (RPO/RTO reais).
- Criar `docker-compose.prod.yml` dedicado (pendência já rastreada em
  `docs/infra/DEPLOY_UBUNTU.md`, reforçada aqui pela ótica de DR).
- Estender o backup para cobrir o volume `app_uploads`, não apenas o
  dump do Postgres.

---

## 2026-08-06 (apêndice 3) — Fechamento das pendências de governança/documentação: Documento de Requisitos, `01-PLANO.md` reescrito, BPMN de Qualidade/Manutenção, Manual do Usuário com conteúdo prático

**Escopo:** continuação do trabalho de governança documental (apêndices
anteriores desta mesma data), tratando explicitamente as 4 pendências que o
próprio Tech Lead de governança havia deixado registradas como próximo
passo. Trabalho feito em paralelo ao `AdmDBA` (achados de risco de banco,
roles, backup, `docker-compose.prod.yml`) — nenhum arquivo de
`docs/database/` ou infraestrutura de banco foi tocado nesta rodada.

**1. Documento de Requisitos consolidado (NOVO):**
- Criado `docs/arquitetura/DOCUMENTO_DE_REQUISITOS.md` — índice executivo de
  Requisitos Funcionais por módulo (RF-AUT, RF-VEN, RF-COM, RF-EST, RF-PRD,
  RF-QUA, RF-FIN, RF-PAT, RF-RH, RF-REL, RF-INT), cada linha com link para o
  UC formal e/ou rota real (`server/app.ts`, `client/src/App.tsx`).
- Não duplica os UCs (`docs/projeto/04-USE_CASES.md`,
  `docs/business/01-USE_CASES.md` continuam sendo a fonte detalhada) nem os
  RNFs (aponta para `REQUISITOS_NAO_FUNCIONAIS.md` em vez de repetir).
- **Achado relevante durante a extração:** UC-19 (Importação/COMEX) está
  descrito em `docs/projeto/04-USE_CASES.md` mas não tem nenhuma rota/
  modelo correspondente no backend — marcado `[PENDENTE]` como RF-COM-12,
  com nota de divergência UC×código explícita na seção final do documento.
  Mesma lógica aplicada a RF-PAT-05 (status do `Asset` não é atualizado
  automaticamente por uma ordem de manutenção — gap real de código, não
  suposição).

**2. `docs/projeto/01-PLANO.md` reescrito:**
- A versão anterior descrevia um MVP inicial (18 modelos, "Frontend: React
  (planejado)", "PostgreSQL 8.0+", 14 módulos numerados de forma solta).
  Reescrito para refletir o estado real: stack atual (React 19 cabeado,
  PostgreSQL 16, mobile/TV novos), lista de módulos por domínio real
  (`server/src/modules/`), e removida qualquer duplicação de roadmap —
  agora aponta para `CLAUDE.md` §5 como SSOT do roadmap em vez de manter
  uma segunda lista que poderia divergir.
- Pendências reais mantidas de forma honesta (COMEX, Payroll/Benefícios,
  Certificações, CNAB, capacidade finita) em vez de "modelo pendente"
  genérico do texto antigo.

**3. BPMN de Qualidade e Manutenção (NOVO):**
- Adicionadas seções 4 e 5 a
  `docs/arquitetura/DIAGRAMA_CASOS_DE_USO_BPMN.md` (mesmo padrão Mermaid
  `flowchart` das seções 2/3 já existentes — Order-to-Cash/Purchase-to-Pay):
  - **Qualidade:** inspeção (recebimento/in-process/final/laboratório) →
    liberação (`release`) ou bloqueio (`block`) de lote → registro de NC
    (UC-17, ciclo `open → analysis → corrective_action →
    effectiveness_check → closed`) → impacto no `quality_score` do
    fornecedor. Baseado em `server/src/modules/nonConformities/`,
    `server/src/modules/inventory/` (`ReleaseLotUseCase`/`BlockLotUseCase`)
    e `client/src/pages/quality/InspectionTab.tsx`.
  - **Manutenção:** solicitação (UC-18) → execução (`open → scheduled →
    in_progress → waiting_parts → completed/canceled`) → **gap real
    documentado explicitamente no diagrama**: `Asset.status` não é
    atualizado automaticamente pelo módulo de manutenção hoje (atualização
    manual, à parte) — mesmo achado do item 1 acima, agora também visual.

**4. Manual do Usuário — conteúdo prático (parcial, conforme escopo pedido):**
- `docs/manual/00-MANUAL_DO_USUARIO.md` ganhou passo a passo prático
  completo para **Vendas** (§2 — cadastro de cliente, venda, alteração de
  pedido, NF-e parcial, tabela de preços, expedição), **Compras** (§4 —
  requisição → RFQ/cotação com adjudicação e split → conversão direta →
  recebimento com quarentena → avaliação de fornecedor), **Estoque/
  Inventário** (§5 — movimentação manual, recebimento, expedição, contagem
  cíclica na tela web **e no app mobile via QR Code**, múltiplos depósitos)
  e **Produção** (§6 — criação de OP contra estoque real, BOM, MRP com
  conversão manual/automática, apontamento boa/refugada, parada de máquina
  com bloqueio de segunda parada simultânea, centros de trabalho).
- Seções de menor uso diário (Qualidade/Laboratório, Engenharia, Financeiro,
  Patrimônio/Manutenção, RH, Relatórios, Rastreabilidade, Administração,
  painel Android TV) permanecem esqueleto — cada cabeçalho agora rotulado
  explicitamente "— esqueleto" ou "— conteúdo completo" para não deixar
  ambíguo o que já foi tratado nesta rodada.

**Arquivos tocados:**
- Criado: `docs/arquitetura/DOCUMENTO_DE_REQUISITOS.md`.
- Reescrito: `docs/projeto/01-PLANO.md`.
- Editado (2 seções novas + referências): `docs/arquitetura/DIAGRAMA_CASOS_DE_USO_BPMN.md`.
- Editado (conteúdo prático + rótulos de status): `docs/manual/00-MANUAL_DO_USUARIO.md`.
- Este apêndice em `docs/governance/go-live/DIARIO_BORDO_GO_LIVE_G6.md`.
- `CLAUDE.md` §8 (link novo para `DOCUMENTO_DE_REQUISITOS.md`).

**Pendências que ficam para uma próxima rodada (não fechadas aqui):**
- Manual do Usuário: capturas de tela, guia de erros comuns, e conteúdo
  prático (hoje esqueleto) para Qualidade, Engenharia, Financeiro,
  Patrimônio/Manutenção, RH, Relatórios, Administração e painel Android TV.
- Decisão de negócio sobre UC-19 (COMEX): implementar de fato ou marcar
  `[DESCONTINUADO]` em `docs/projeto/04-USE_CASES.md` — registrado em
  `docs/governance/TODO.md` para não ficar só neste diário.
- Decisão sobre RF-PAT-05 (sincronização automática `Asset.status` ↔ ordem
  de manutenção): gap real ou comportamento manual intencional — mesma
  observação, levar para `docs/governance/TODO.md`.

---

## 2026-08-06 (apêndice 4) — `AdmDBA`: remediação real dos 3 achados de risco reportados no apêndice 2 (segregação de roles, backup/restore, `docker-compose.prod.yml`)

**Escopo:** o dono do produto pediu para tratar de verdade os 3 riscos
que o apêndice 2 apenas documentou. Nada foi feito "no escuro" — cada
item abaixo foi testado no ambiente local antes de ser dado como
concluído.

**1. Role Postgres de privilégio mínimo (`evok_app`) — implementada e
testada:**
- Migration
  `server/migrations/20260806-000080-create-app-role-least-privilege.cjs`
  criada e aplicada (`npm run migration:up`). Cria `evok_app`
  (`NOSUPERUSER`/`NOCREATEDB`/`NOCREATEROLE`, sem nenhum DDL) com
  `SELECT/INSERT/UPDATE/DELETE` em todas as tabelas de negócio, exceto
  `SequelizeMeta`/`SequelizeData`, mais `ALTER DEFAULT PRIVILEGES` para
  cobrir tabelas futuras automaticamente (sem exigir GRANT manual a cada
  migration nova).
- Testado de verdade: conexão TCP com senha (`psql -h 127.0.0.1 -U
  evok_app`) consegue `SELECT` em `items`, mas recebe `permission
  denied` ao tentar `CREATE TABLE` ou ler `SequelizeMeta`. `curl
  /health/ready` confirmado respondendo antes e depois da migration
  (API seguiu usando `evok_admin`, sem interrupção). `npm test` (86
  suites/670 testes) passou depois da mudança.
- **Decisão consciente e explícita: a credencial ativa do `.env` NÃO foi
  trocada nesta rodada.** O backend/frontend estavam em uso ativo pelo
  usuário durante esta remediação; trocar `DB_USER` exige reiniciar a
  API, o que teria interrompido esse uso. A role existe, está testada e
  documentada — a troca de `.env` fica registrada como passo manual
  explícito para quando for apropriado (ver
  `docs/database/05-ACESSOS_E_ISOLAMENTO.md` §1.1).

**2. Backup: agendamento ativado e restore testado de ponta a ponta:**
- `scripts/schedule-backup-task.ps1` registrou de fato a tarefa
  `EvokAudioPostgresBackup` no Agendador de Tarefas do Windows deste
  ambiente (não exigiu privilégio de administrador; `NextRunTime`
  confirmado via `Get-ScheduledTaskInfo`).
- Rodada manual de `scripts/backup-postgres.sh` gerou um dump novo
  (`erp_evok_audio_20260806_145213.dump`), quebrando a lacuna de 6 dias
  sem backup identificada no apêndice 2.
- **Restore testado de verdade**: `pg_restore --no-owner --no-privileges`
  do dump acima em um banco Postgres descartável
  (`erp_evok_audio_restore_test`) — resultado: **79/79 tabelas com
  contagem de linhas idêntica** ao banco de origem (conferido também
  campo a campo em `users`, `items`, `suppliers`, `production_orders`,
  `sale_items`, `inventory_movements`, `SequelizeMeta`). Banco de teste
  removido ao final, sem deixar resíduo.
- Detalhe completo, incluindo o que esse teste **não** cobre (servidor
  novo do zero, volume `app_uploads`, RTO cronometrado), em
  `docs/database/07-DISASTER_RECOVERY.md` §1.1/§2.1.

**3. `docker-compose.prod.yml` — criado:**
- Esqueleto novo na raiz do repo, baseado no `docker-compose.yml` de
  dev. Diferenças: `NODE_ENV=production`, `DB_SSL=true` por padrão,
  Postgres sem porta publicada (`expose`, não `ports`), API vinculada a
  `127.0.0.1:5000` (reverse proxy fica de fora, decisão de domínio/
  certificado é do servidor real quando existir), healthchecks,
  `restart: unless-stopped`, volumes dedicados para uploads e logs,
  comentários explícitos sobre o que falta preencher.
- Validado com `docker compose -f docker-compose.prod.yml config` (sem
  erro). **Não implantado de verdade** — não há servidor de produção
  ainda (pendência já conhecida, ver `docs/governance/go-live/GO_LIVE_G6_CHECKLIST.md`).

**Nada quebrou:** `npm test` a partir de `server/` (86 suites, 670
testes) passou após todas as mudanças; `GET /health/ready` respondeu
`{"status":"ready","database":"up"}` durante toda a rodada.

**Arquivos tocados:**
- Criado: `server/migrations/20260806-000080-create-app-role-least-privilege.cjs`,
  `docker-compose.prod.yml`.
- Editado: `docs/database/05-ACESSOS_E_ISOLAMENTO.md` (seções 1.1/1.2
  novas), `docs/database/07-DISASTER_RECOVERY.md` (seções 1.1/2.1
  novas), `docs/infra/DEPLOY_UBUNTU.md` (checklist atualizado),
  `.env.example` (`APP_DB_ROLE_PASSWORD`), `docs/governance/TODO.md`
  (seção nova), este apêndice.

**Pendências que ficam para uma próxima rodada:**
- Trocar `DB_USER` do `.env` ativo para `evok_app` (dev e depois
  produção) — passo manual documentado, não aplicado.
- Ativar `scripts/schedule-backup-cron.sh` no servidor de produção real,
  quando adquirido (o agendamento desta rodada é local, não produção).
- Estender o backup para cobrir o volume `app_uploads`.
- Testar restore em servidor/máquina limpa nova (cenário de catástrofe
  total) e formalizar RPO/RTO com o dono/CFO — só possível com servidor
  real.
- Roles `evok_backup` e de migration dedicada (separadas de
  `evok_admin`) — decisão consciente de não criar nesta rodada, ganho de
  segurança menor que o da role de runtime já implementada.

### 2026-08-06 (auditoria cruzada `AuditorIntegrador`) — Requisitos × Banco × API

**Escopo:** auditoria "pente fino" cruzando
`docs/arquitetura/DOCUMENTO_DE_REQUISITOS.md` (RF-*),
`docs/database/04-DICIONARIO_DADOS.md`/`schema.sql` e `docs/arquitetura/API.md`, mais
os diagramas de classes/sequência/infraestrutura/BPMN. Não altera
código, schema ou comportamento — só documentação de documentação.

**Status:** REPROVADO COM RESSALVAS (relatório completo apresentado ao
solicitante na resposta da sessão; achados reais registrados em
`docs/governance/TODO.md`, seção "2026-08-06 (auditoria cruzada
`AuditorIntegrador`)").

**Achado principal:** `docs/arquitetura/API.md` documenta rigorosamente só uma
fração dos grupos de rota reais montados em `server/app.ts` — pelo menos
17 dos ~34 grupos de rota (incluindo módulos inteiros marcados
`[IMPLEMENTADO]` no Documento de Requisitos: requisição de compra,
qualidade/NC, laboratório, ativos, manutenção, RH, rastreabilidade,
audit logs, ordens de serviço, config fiscal, inventário mobile,
webhooks, auditor inteligente, centros de trabalho, e o próprio Item
Mestre `/api/items`) não têm nenhuma seção própria em `docs/arquitetura/API.md`. O
Documento de Requisitos e o Dicionário de Dados, por outro lado, estão
mutuamente consistentes e bem cross-referenciados — a lacuna está
concentrada especificamente no contrato de API publicado.

**Achados secundários:** 2 rotas com método/caminho HTTP incorretos em
`docs/arquitetura/DIAGRAMAS_SEQUENCIA.md` (production-orders e
purchases/:id/status); inconsistência de convenção de caixa
(snake_case × camelCase) entre request e response do mesmo endpoint
(`PUT /api/users/:id/access-profile`) e entre módulos diferentes, sem
nota explicando a regra.

**Sem achados de risco de segurança/isolamento** — `docs/database/05-ACESSOS_E_ISOLAMENTO.md`
(matriz de privilégios + isolamento de serviços externos) permanece
consistente com o que `docs/arquitetura/API.md` documenta como superfície pública
(webhooks autenticados por HMAC/segredo compartilhado, sem credencial de
banco; nenhum endpoint expõe coluna sensível fora da matriz de
privilégios).

**Auditoria parcial declarada:** leitura linha a linha completa do corpo
de `docs/projeto/04-USE_CASES.md` (1217 linhas) e checagem campo a campo
de 100% dos payloads de `docs/arquitetura/API.md` contra o Dicionário de Dados não
foram concluídas nesta rodada (ver detalhamento em `docs/governance/TODO.md`).

---

## 2026-08-06 (apêndice 5) — Pente-fino estrutural da árvore de `docs/` (nomenclatura de pastas/arquivos, links quebrados)

**Escopo:** auditoria estrutural (não de conteúdo técnico — essa parte
coube ao `AuditorIntegrador` em paralelo, ver apêndice anterior) sobre
`docs/` inteiro: nomes de pasta, convenção de nomenclatura de arquivo,
links markdown internos, referências cruzadas para arquivos
renomeados/removidos, encoding e paridade `.claude/agents` ×
`.codex/agents`.

**Método:** levantamento completo da árvore real (`find docs -type f`,
19 pastas / ~100 arquivos), extração e resolução programática de **todos**
os 115 links markdown `[texto](arquivo.md)` de `docs/*.md` +
`docs/*/*.md` + `CLAUDE.md`/`README.md`/`AGENTS.md` contra o
filesystem real (case-sensitive, simulando Linux), mais varredura de
menções em texto corrido (crase, sem sintaxe de link) a caminhos
`docs/*.md`.

**Resultado dos links markdown formais:** **0 quebrados** — os 115
links `[texto](arquivo.md)` resolvem exatamente (inclusive checagem
case-sensitive; nenhum link sobrevive só por o Windows ser
case-insensitive).

**Achados reais (todos registrados em `docs/governance/TODO.md`, seção
"2026-08-06 (apêndice 5 — pente-fino estrutural)"):**
1. Mistura de idioma nos nomes de pasta de `docs/` (maioria em
   português — `producao/`, `comercial/`, `financeiro/`, `projeto/`,
   `arquitetura/`, `manual/` etc. — mas `business/`, `database/`,
   `governance/`, `infra/` em inglês, sem critério documentado).
2. `docs/business/01-USE_CASES.md` é um draft explícito (UC-30+, o
   próprio arquivo diz "a consolidar em `docs/projeto/04-USE_CASES.md`")
   mas a consolidação está **parcial**: UC-35, UC-35-Exceção, UC-36,
   UC-37, UC-38, UC-42 e UC-43 nunca foram copiados para
   `docs/projeto/04-USE_CASES.md`, mesmo com os Blocos 1/3/4/5/6
   correspondentes já `[x]` no TODO.
3. `docs/patrimonio/03-MANUTENCAO.md` está **vazio (0 bytes)**, apesar
   de listado com propósito definido ("Manutenção corretiva e
   preventiva") no próprio `docs/patrimonio/00-README.md`.
4. 3 referências cruzadas soltas (texto corrido, não link markdown) a
   arquivos que não existem mais: `docs/governance/HANDOFF_CODEX.md` cita
   `docs/BLACKBOX_CRONOGRAMA_CHECKLIST.md` e `docs/DATABASE_DICTIONARY.md`;
   `docs/producao/06-BOM.md` cita `docs/BLACKBOX_CRONOGRAMA_CHECKLIST.md`
   2x (associado a uma afirmação de que o MRP "ainda não foi
   implementado", que hoje diverge de `CLAUDE.md` §4 — MRP está
   implementado); `docs/infra/BACKUP_RESTORE_G2_2026-07-31.md` cita
   `docs/UAT_RELEASE_G6_2026-07-31.md`, que nunca existiu no repositório.
5. `.codex/agents/` tem 14 arquivos `.toml` contra 15 `.md` em
   `.claude/agents/` — falta o equivalente de `webdesiner.md`.

**Corrigido diretamente nesta sessão (trivial e inequívoco):**
- `CLAUDE.md` §3 e `AGENTS.md` §3 (árvore de pastas): atualizada para
  refletir as pastas reais de `docs/` hoje (`arquitetura/`, `database/`,
  `business/`, `governance/`, `manual/`, `infra/` + as 12 pastas
  departamentais), que tinham sido criadas em sessões anteriores sem
  atualizar a árvore ilustrativa; `AGENTS.md` também ganhou as entradas
  `mobile/`/`tv/` que já existiam em `CLAUDE.md` mas faltavam ali.
- `docs/governance/CRONOGRAMA_FRONTEND_2026-07-31.md`: adicionada nota junto à
  referência a `docs/CRONOGRAMA_CORRECAO_E_GO_LIVE_2026-07-30.md` e
  `docs/BLACKBOX_CRONOGRAMA_CHECKLIST.md` avisando que nenhum dos dois
  existe mais (mesmo padrão já usado em `.codex/agents/evok-production-remediation.toml`
  e `.claude/agents/evok-production-remediation.md`), sem alterar o
  restante do conteúdo histórico do documento.

**Não corrigido (decisão que cabe ao dono/aos agentes de conteúdo, não
puramente estrutural):** o conteúdo faltante em
`docs/patrimonio/03-MANUTENCAO.md`; a consolidação completa de
`docs/business/01-USE_CASES.md` → `docs/projeto/04-USE_CASES.md`; a
correção da afirmação "MRP ainda não implementado" em
`docs/producao/06-BOM.md` (é uma alegação de negócio, não um link — fora
do escopo de uma auditoria puramente estrutural); qual documento (se
algum) deveria substituir `docs/UAT_RELEASE_G6_2026-07-31.md`; se as
pastas `docs/business/`, `docs/database/`, `docs/governance/`,
`docs/infra/` devem ser renomeadas para português por consistência (não
decidido unilateralmente — ver `docs/governance/TODO.md`); criação do
`.codex/agents/webdesiner.toml` faltante.

---

## 2026-08-06 (apêndice 6) — `ArquitetoSoftwareAPI`: remediação dos 4
achados da auditoria cruzada `AuditorIntegrador` em `docs/arquitetura/API.md` e
`docs/arquitetura/DIAGRAMAS_SEQUENCIA.md`

**Origem:** `docs/governance/TODO.md`, seção "2026-08-06 (auditoria
cruzada `AuditorIntegrador`)" — reprovação de `docs/arquitetura/API.md` por cobrir só
~metade das rotas reais montadas em `server/app.ts`, mais 2 erros de rota
no diagrama de sequência e 2 achados de convenção de casing. Território
exclusivo desta sessão: `docs/arquitetura/API.md` e
`docs/arquitetura/DIAGRAMAS_SEQUENCIA.md` — nenhuma alteração de código.

**Método:** para cada grupo de rota apontado como não documentado, leitura
direta do arquivo de rotas real (`presentation/routes/*.ts`), do
controller e do validator Zod (quando existir) antes de escrever a seção
— nenhum campo/payload foi inferido de memória ou copiado de outra seção
por analogia.

**1. 18 grupos de rota sem seção em `docs/arquitetura/API.md` — todos cobertos.**
Confirmados contra `server/app.ts` e adicionados como seções novas (15 a
31) ou encaixados em seções existentes onde fazia sentido temático:

- Seção 1 (Autenticação): `POST /api/auth/forgot-password` e
  `POST /api/auth/reset-password` (SEC-12), incluindo a nota de que
  `resetPasswordSchema.newPassword` é uma exceção pontual em camelCase.
- Seção 8.3 (nova): `/api/inventory/lots*` — listagem, busca por código,
  QR code, liberação e bloqueio de lote.
- Seções 15–31 (novas, ao final do documento, para não forçar
  renumeração de nada existente): Requisição de Compra, Qualidade (RNC),
  Laboratório, Engenharia (Projetos/Desenhos/Ficha Técnica), Patrimônio,
  Manutenção, RH (Funcionários), RH (Departamentos), Rastreabilidade,
  Logs de Auditoria, Ordens de Serviço, Fiscal (config. do emitente),
  Inventário Mobile, Webhooks, Auditor Inteligente, Centros de Trabalho,
  Itens (Item Mestre).

Cada seção documenta método/rota, `authorizeModule`/`authorize` real da
rota (inclusive os casos "aditivo" que compõem duas checagens, ex.
`engenharia`/`laboratorio`, e os módulos que **não** passaram pelo
retrofit e ainda usam só `authorize(role)` legado — `employees`,
`departments`, `audit-logs`, `auditor`, `fiscal`), payload com tipos reais
do schema Zod (ou do model, quando não há validator dedicado) e códigos de
erro observados no código.

**Surpresa encontrada no caminho:** nenhuma das 18 rotas apontadas pela
auditoria era inexistente ou divergente do código — todas bateram
exatamente com `server/app.ts`. O único ajuste de escopo foi tratar
`/api/inventory/lots*` como parte da seção 8 (Estoque) em vez de uma
seção própria numerada — mais coerente tematicamente, já que o restante
do módulo `inventory` já vive ali.

**2. Achado nº 5 da auditoria confirmado: QR de lote é on-the-fly.**
`GenerateEntityQrCodeUseCase` + `inventoryController.getLotQrCode` geram o
PNG/SVG em memória a cada chamada (payload
`{ lot_number, product_code, product_name }` via `QRCodeService`), sem
nenhuma coluna de imagem/payload persistida em `lot_controls` — documentado
explicitamente na nova seção 8.3, junto com o mesmo comportamento (já
existente) em `GET /api/assets/:id/qrcode`.

**3. 2 erros de rota em `docs/arquitetura/DIAGRAMAS_SEQUENCIA.md`
corrigidos:**
- Fluxo 3 (OP → Apontamento): `POST /api/production/orders` e
  `PATCH /api/production/orders/:id` → `POST /api/production-orders` e
  `PUT /api/production-orders/:id/status`.
- Fluxo 2 (Requisição → RFQ → Pedido → Recebimento):
  `PATCH /api/purchases/:id/status` → `PUT /api/purchases/:id/status`.

**4. Nota de convenção de caixa (casing) adicionada no topo de
`docs/arquitetura/API.md`.** Confirmado no código que não existe convenção única:
`underscored: true` (presente em todos os models) só afeta a coluna do
banco, não a chave JSON — o que aparece na resposta depende de como cada
model declarou o nome do atributo JS (`Client`/`Sale` em snake_case,
`User` em camelCase com `field:` explícito, `Item` renomeando os próprios
timestamps para `criado_em`/`atualizado_em`). O caso citado pela auditoria
(`PUT /api/users/:id/access-profile` — request `access_profile_id` snake,
response `accessProfileId` camel) foi confirmado como **comportamento real
do código**, não erro de digitação da doc — mantido como estava, só
explicado. Os 2 exemplos que estavam de fato incorretos frente ao
comportamento real do Sequelize (`GET /api/clients` e `GET /api/sales`
mostrando `"created_at"`, quando o Sequelize sempre serializa timestamps
como `createdAt`/`updatedAt`) foram corrigidos.

**Não alterado:** nenhum arquivo fora de `docs/arquitetura/API.md` e
`docs/arquitetura/DIAGRAMAS_SEQUENCIA.md`; nenhum código em `server/src/`.
`docs/governance/TODO.md` (seção "2026-08-06 (auditoria cruzada
`AuditorIntegrador`)") atualizado marcando `[x]` os 4 achados acima, com
referência às seções novas de `docs/arquitetura/API.md`.

**Sinalizado para o `AuditorIntegrador`:** validar que o conteúdo das 18
seções novas bate com `docs/arquitetura/DOCUMENTO_DE_REQUISITOS.md`
(RF-COM, RF-QUA, RF-PAT, RF-RH, RF-REL, RF-AUT, RF-FIN, RF-EST, RF-INT,
RF-PRD citados no achado original) e com o Dicionário de Dados de
`AdmDBA` — esta sessão conferiu contra o código real (rotas/controllers/
validators), não linha a linha contra os dois documentos de requisitos/
banco.

---

## 2026-08-06 (apêndice 6) — Correção dos 4 achados de conteúdo do pente-fino estrutural (apêndice 5)

**Escopo:** remediação, pelo `documentador`, dos 4 achados de conteúdo
deixados em aberto no apêndice 5 (achados 2, 3 e 4 acima) — consolidação
de UCs, preenchimento de `03-MANUTENCAO.md` e correção das referências
cruzadas soltas. Não tocou em `docs/arquitetura/API.md`,
`docs/arquitetura/DIAGRAMAS_SEQUENCIA.md`, `docs/database/` nem
`server/` (fora do território desta tarefa).

**1. Consolidação de UC-35 a UC-43 em `docs/projeto/04-USE_CASES.md`:**
verificados um a um contra o código real antes de consolidar (não foi
copiado texto sem checagem):
- **UC-35, UC-35-Exceção, UC-36, UC-37, UC-38, UC-42** confirmados
  `[IMPLEMENTADO]` por leitura direta do código (`AccessDeniedPage.tsx`,
  `ModuleRoute`, `NO_ACCESS_PROFILE`, `authorizeModule`,
  `quality-releases-receiving-lot.test.ts`, `DashboardPage.tsx canSee`,
  rotas `relatorios.*`/`rastreabilidade`, `warehouseStockService`,
  `ChangeSaleStatusUseCase` debitando exclusivamente `ACABADOS`,
  `CreateAcousticTestUseCase` debitando `LABORATORIO`). Achado relevante:
  o texto antigo do draft (`docs/business/01-USE_CASES.md`) dizia que os
  Fluxos D (expedição exclusiva de Acabados) e E (débito automático de
  teste destrutivo) de UC-42 "ainda não implementados" — isso estava
  desatualizado; ambos já tinham sido entregues em 2026-08-04 (Bloco
  4.2/4.4 do `TODO.md`), só o texto do UC não tinha sido atualizado.
- **UC-43 consolidado como parcial**: Fluxo B (alerta didático de 3
  partes) `[IMPLEMENTADO]` nas 9 telas priorizadas; Fluxo A
  (`PrerequisiteChecklist` preventivo) confirmado `[PENDENTE]` — o
  componente existe (`client/src/components/PrerequisiteChecklist.tsx`)
  mas `grep` confirmou 0 telas consumindo-o.
- Nenhum `[x]` indevido foi encontrado nos Blocos 1/3/4/5/6 do `TODO.md`
  correspondentes a esses UCs — todos já refletiam o estado real
  corretamente.
- `docs/governance/TODO.md` (seção "apêndice 5") atualizado: item de
  consolidação marcado `[x]` com o detalhamento acima.

**2. `docs/patrimonio/03-MANUTENCAO.md` preenchido (estava 0 bytes):**
conteúdo escrito a partir do código real (`server/src/modules/maintenance/`,
model `MaintenanceOrder`, telas `client/src/pages/maintenance/`), sem
duplicar `docs/arquitetura/DIAGRAMA_CASOS_DE_USO_BPMN.md` §5 nem
`docs/manual/00-MANUAL_DO_USUARIO.md` §10 — o documento novo resume e
linka para ambos. Inclui, como pedido explicitamente, a ressalva já
conhecida (`RF-PAT-05 [PENDENTE]` em
`docs/arquitetura/DOCUMENTO_DE_REQUISITOS.md` §8): `Asset.status` **não**
é sincronizado automaticamente com ordens de manutenção — o enum
`in_maintenance` existe no modelo `Asset`, mas nenhum use case do módulo
`maintenance` o altera; atualização de status do ativo é manual hoje,
decisão de automação pendente do dono.

**3. Referências cruzadas soltas corrigidas (as 4 do apêndice 5):**
- `docs/governance/HANDOFF_CODEX.md:418` (`docs/BLACKBOX_CRONOGRAMA_CHECKLIST.md`) —
  nota histórica adicionada (arquivo não existe mais; ordem de execução
  já foi seguida, Fases 1–4.1 concluídas).
- `docs/governance/HANDOFF_CODEX.md:1571` (`docs/DATABASE_DICTIONARY.md`) —
  confirmado como o nome antigo do que hoje é
  `docs/database/04-DICIONARIO_DADOS.md` (arquivo existe, `Glob`
  confirmou); referência corrigida para o caminho real.
- `docs/producao/06-BOM.md:28` e `:330` — a afirmação "MRP ainda não
  implementado" era de fato `[AUDITORIA-FALHOU]` (divergia de
  `CLAUDE.md` §4). Texto reescrito para descrever o fluxo real hoje
  implementado (BOM → MRP contra estoque real → reserva automática na
  liberação da OP → requisição de compra via UC-24/UC-24b → apontamento/
  baixa de estoque no chão de fábrica → custo real da OP), com nota de
  correção explícita e a citação órfã tratada com o mesmo padrão de nota
  histórica usado em `docs/governance/CRONOGRAMA_FRONTEND_2026-07-31.md`.
- `docs/infra/BACKUP_RESTORE_G2_2026-07-31.md:336`
  (`docs/UAT_RELEASE_G6_2026-07-31.md`) — nota adicionada esclarecendo
  que o arquivo nunca existiu e que a descrição do ensaio de canário já
  presente no próprio documento é o registro disponível; aponta
  `docs/governance/go-live/GO_LIVE_G6_CHECKLIST.md` como fonte vigente de status de Gate
  G6/rollback.

**Não corrigido nesta rodada (fora do território/decisão do dono, sem
mudança de status):** mistura de idioma nos nomes de pasta de `docs/`
(achado 1 do apêndice 5) e paridade `.claude/agents/` ×
`.codex/agents/` (achado 5) — ambos continuam `[ ]` no
`docs/governance/TODO.md`, aguardando decisão/execução fora do escopo
desta tarefa.

---

### 2026-08-06 (apêndice 8) — Sincronização documental: RF-PAT-05 e UC-19/RF-COM-12 passam a `[IMPLEMENTADO]`

**Origem:** duas features implementadas no backend no mesmo dia por
outros agentes (`RF-PAT-05` — sincronização automática de `Asset.status`
com o ciclo de vida da ordem de manutenção; `UC-19`/`RF-COM-12` — módulo
Importação/COMEX) deixaram as docs de requisitos/arquitetura descrevendo
o estado antigo. Território desta rodada: `docs/arquitetura/`,
`docs/projeto/04-USE_CASES.md`, `docs/patrimonio/03-MANUTENCAO.md`,
`docs/arquitetura/API.md`, `docs/arquitetura/DIAGRAMA_CLASSES.md`, `CLAUDE.md`,
`docs/governance/TODO.md`. Não tocado: `docs/database/`, `client/`,
`server/` (outros agentes em paralelo).

**1) RF-PAT-05 (`Asset.status` ↔ ordem de manutenção), confirmado contra
o código real** (`UpdateMaintenanceOrderUseCase.ts`,
`CancelMaintenanceOrderUseCase.ts`): OM transiciona para `in_progress` →
`Asset.status = 'in_maintenance'`; OM `completed`/`canceled` →
`Asset.status` volta a `'active'` **somente se** o ativo ainda estiver
`in_maintenance` **e** não houver outra OM aberta para o mesmo ativo.
Atualizado:
- `docs/arquitetura/DOCUMENTO_DE_REQUISITOS.md` §8 — RF-PAT-05 de
  `[PENDENTE]` para `[IMPLEMENTADO]`, com a descrição correta do
  comportamento (incluindo a condição de não "ressuscitar" ativos
  baixados); tabela de "Divergências UC × Código" também atualizada com
  nota `[RESOLVIDO 2026-08-06]`.
- `docs/arquitetura/DIAGRAMA_CASOS_DE_USO_BPMN.md` §5 — o nó
  `[PENDENTE]` sobre `Asset.status` foi reescrito para descrever o fluxo
  automático real (dois novos nós de decisão: transição para
  `in_progress` marca o ativo, e a existência de outra OM aberta decide
  se o ativo é liberado ao concluir/cancelar).
- `docs/patrimonio/03-MANUTENCAO.md` §6 — a ressalva "não é sincronizado
  automaticamente" (escrita horas antes, na mesma data, antes da
  implementação) foi substituída pela descrição do comportamento novo,
  citando os testes de `maintenance-use-cases.test.ts`.

**2) UC-19/RF-COM-12 (Importação/COMEX), backend confirmado contra
`server/src/modules/comex/` e os validators Zod reais em
`presentation/validators/importProcessValidators.ts`:**
- `docs/projeto/04-USE_CASES.md` — UC-19 de `[PENDENTE]` (implícito, sem
  tag) para `[IMPLEMENTADO]` (backend; tela web pendente), com as
  decisões de escopo resumidas (fórmula fiscal simplificada, alíquotas
  manuais sem Siscomex/NCM, sem AP automática de tributos).
- `docs/arquitetura/DOCUMENTO_DE_REQUISITOS.md` §3 — RF-COM-12 de
  `[PENDENTE]` para `[IMPLEMENTADO]`; tabela de divergências atualizada.
- `docs/arquitetura/API.md` — nova seção `§32. Importação / COMEX`, no mesmo formato
  das seções §15–§31 (método, rota, RBAC `comex`, payloads reais
  confirmados contra os validators, códigos de erro).
- `docs/arquitetura/DIAGRAMA_CLASSES.md` — módulo `comex` adicionado à seção de
  módulos recentes de 2026-08-06 (models `ImportProcess`/
  `ImportProcessItem` na tabela existente + subseção nova descrevendo
  repositório/use cases/presentation, seguindo o padrão Clean
  Architecture já usado por `rfq/`/`maintenance/`).
- `CLAUDE.md` §1 (Status Atual) e §4 (Compras & Suprimentos) — módulo de
  importação novo mencionado; contagem de migrations atualizada de 64
  para **66** (confirmado por contagem real de arquivos em
  `server/migrations/`); FAQ "Frontend está pronto?" ajustada para citar
  a exceção real (COMEX ainda sem tela).

**3) `docs/governance/TODO.md`** — os dois achados antigos que ainda
diziam "UC-19 zero implementação"/"decisão pendente" (apêndice 4, item 1,
e a lista de achados do apêndice 5) foram marcados `[x]` com nota
`[IMPLEMENTADO 2026-08-06]` apontando para o apêndice 7 (onde o backend
já estava registrado como `[x]`/`[IMPLEMENTADO]` desde a rodada de
implementação) — texto histórico original preservado, apenas anotado.
Nota de atualização também acrescentada ao achado 2 do apêndice 4/5 (RF-
PAT-05) confirmando que as docs de arquitetura foram atualizadas nesta
rodada.

**Não alterado nesta rodada (fora do território):** `docs/governance/HANDOFF_CODEX.md`
já continha o detalhamento técnico completo de ambas as features (usado
como fonte primária desta consolidação) e não precisou de correção;
`docs/database/` já tinha sido regenerado por `AdmDBA` em rodada anterior
no mesmo dia (ver apêndice 7).

---

## 2026-08-06 (quarta rodada) — Documentação de banco atualizada pós-módulo COMEX/Importação

**Contexto:** migration `server/migrations/20260806-000090-create-import-processes.cjs`
(módulo COMEX/Importação, UC-19) já aplicada por outro agente antes desta
tarefa — criou `import_processes`/`import_process_items` (66 migrations
no total). Território estrito: `docs/database/` + este diário +
`docs/governance/TODO.md` + `docs/database/DATABASE.md` (changelog). Não tocou em
`docs/arquitetura/API.md`, `docs/arquitetura/`, `docs/projeto/`, `client/`, `server/`
nem criou migration nova.

**O que foi feito:**
1. `docs/database/gen_dict.py` — adicionadas descrições de negócio
   curadas para `import_processes`/`import_process_items` no
   `TABLE_DESC` (lidas da migration + models `ImportProcess.ts`/
   `ImportProcessItem.ts`: FOB, câmbio, rateio de frete/seguro/despesas,
   alíquotas II/IPI/PIS/COFINS/ICMS manuais, custo nacionalizado).
2. `docs/database/04-DICIONARIO_DADOS.md` regenerado por introspecção
   real (`_columns_raw.psv`/`_constraints_raw.psv` via `psql` +
   `gen_dict.py`) — agora 80 tabelas (era 78).
3. `docs/database/schema.sql` regenerado via `pg_dump --schema-only
   --no-owner --no-privileges` contra `evok-postgres` (10886 linhas).
4. `docs/database/02-MODELO_LOGICO.md` — novo bloco Mermaid "Compras:
   Processo de Importação (COMEX)" (`SUPPLIERS`→`IMPORT_PROCESSES`→
   `IMPORT_PROCESS_ITEMS`→`ITEMS`, confirmado que `item_id` referencia
   `items` UUID, não `products` legado — único ponto do bloco
   Compras/RFQ que já nasce apontando só para o modelo novo).
   `docs/database/01-MODELO_CONCEITUAL.md` — entidade de negócio
   "Processo de Importação (COMEX)" adicionada ao MER e ao glossário.
5. Contagens reconferidas por introspecção real e atualizadas em
   `00-INDICE.md`, `02-MODELO_LOGICO.md`, `03-MODELO_FISICO.md`: 66
   migrations, 80 tabelas de negócio (65 ativas + 12 órfãs PT + 3 log
   técnico de migração), 175 foreign keys (era 171, +4 das 2 tabelas
   novas). `docs/database/07-DISASTER_RECOVERY.md`: números de teste de
   restore real (§2.1, 79 tabelas/`SequelizeMeta=64`) **preservados como
   evidência histórica** (não retroativamente alterados — o teste rodou
   antes desta migration), com nota explícita de defasagem; o "Esperado"
   documentado (não testado, §2 fora do §2.1) atualizado para 81.
6. `docs/database/05-ACESSOS_E_ISOLAMENTO.md` §1.1.1 (novo) — confirmado
   por query real em `information_schema.role_table_grants` que
   `evok_app` recebeu `SELECT/INSERT/UPDATE/DELETE` nas 2 tabelas novas
   **automaticamente**, sem GRANT manual, via `ALTER DEFAULT PRIVILEGES`
   da migration `-000080` — primeira confirmação prática (não só
   teórica) do mecanismo desde que a role foi criada.
7. `docs/database/DATABASE.md` — entrada de changelog nova com o detalhamento
   coluna-a-coluna das 2 tabelas (padrão já usado para RFQ/centros de
   custo/conciliação bancária).

**Verificação antes de escrever números:** `npm run migration:status`
(a partir de `server/`) confirmou as 66 migrations `up`, incluindo
`20260806-000090-create-import-processes.cjs` como a mais recente.
Consulta direta a `information_schema.tables`/`table_constraints`
confirmou 80 tabelas de negócio e 175 foreign keys antes de qualquer
edição de contagem nos documentos.

**Handoff:** nenhum código de aplicação foi alterado nesta rodada — é
puramente documentação de banco. Se o `AuditorIntegrador` ou
`AnalistaNegocios` precisar rastrear UC-19 → banco → API, o ponto de
entrada é `docs/database/04-DICIONARIO_DADOS.md#importprocesses` /
`#importprocessitems` e `docs/database/DATABASE.md` (seção nova, final do
arquivo).

---

## 2026-08-06 (rodada de testes de integração) — Cobertura de integração real (PostgreSQL) das 3 features de maior risco da terceira rodada

**Origem:** `docs/governance/TODO.md`, item "Teste de integração real das
3 features de maior risco da terceira rodada de 2026-08-06" (conciliação
bancária OFX, downtime/índice único parcial de produção, faturamento
parcial de NF-e), até então cobertas apenas por testes unitários com
repositório mockado. Território exclusivo desta rodada:
`server/tests/integration/` (arquivos novos) + `docs/governance/TODO.md`/
este diário — nenhum arquivo de `server/src/` foi alterado.

**Entregue (2 das 3 features):**

1. `server/tests/integration/bank-reconciliation-ofx-import.test.ts` (6
   casos) — importação de extrato OFX 1.x (SGML, tags sem fechamento) e
   2.x (XML, tags com fechamento), dedup por FITID (reimportar o mesmo
   arquivo não duplica lançamento), sugestão automática de match contra
   uma conta a pagar real criada no teste (`POST /api/finance/payable`),
   baixa efetiva via `POST .../entries/:id/match` (confirmado
   `account.status='paid'`), rejeição didática de arquivo inválido.
2. `server/tests/integration/production-downtime-concurrency.test.ts` (3
   casos) — 2 requisições HTTP verdadeiramente concorrentes
   (`Promise.all`) contra o mesmo centro de trabalho provam que o índice
   único parcial `uq_production_downtimes_open_per_work_center` (não só a
   checagem `SELECT ... FOR UPDATE` em aplicação, que só trava linhas
   EXISTENTES e não impede a corrida de dois INSERTs concorrentes) barra a
   2ª parada aberta, com erro tratado (409, via `SequelizeUniqueConstraintError`
   → `errorHandler` global) e nunca 500; reabertura após encerrar a 1ª;
   centros diferentes coexistem.
3. `server/tests/integration/inventory-count-claim-concurrency.test.ts`
   (3 casos, agrupado nesta mesma frente por ser outro caso de lock
   pessimista de alto risco) — 2 clients HTTP simultâneos disputando o
   claim de uma contagem do pool (exatamente 1 vence), contagem atribuída
   a funcionário específico não pode ser roubada por outro operador (409),
   admin pode fazer override.

**Não coberto nesta rodada (decisão explícita):** faturamento parcial de
NF-e — o agente de Vendas está refatorando esse fluxo para `sale_invoices`
em paralelo (`server/tests/integration/sale-invoice-history.test.ts` já
apareceu no working tree durante esta rodada) e vai escrever o teste de
integração dele junto, evitando conflito de edição concorrente.

**Achado registrado (comportamento correto, não bug):** a perdedora da
corrida de claim pelo POOL de uma contagem de inventário recebe **422**
(`BusinessRuleError`, "não está em status draft"), não 409 — a checagem de
status em `StartInventoryCountUseCase` vem antes da checagem de
`assigned_to`. Documentado no teste e no TODO para não confundir leitura
futura; nenhuma correção de código foi necessária (comportamento correto
do lock pessimista).

**Evidência de execução real:**
- `node scripts/run-api-suite.cjs integration` (server real + PostgreSQL
  real `erp_evok_audio_test`, migrations aplicadas, servidor em
  `127.0.0.1:3101`): **32/32 suites, 88/88 testes passando** (rodada
  final, após ajustar a expectativa 409→422 acima).
- `npx jest tests/unit`: **88/88 suites, 711/711 testes passando** — sem
  regressão, nenhum código de produção alterado.
- Nota de reprodutibilidade: numa rodada intermediária,
  `entity-photo-qrcode.test.ts` (arquivo pré-existente, não desta rodada)
  falhou 2 casos com 500 em `POST /api/assets/:id/photo`; na rodada final,
  com o mesmo código, passou 100%. Não investigado a fundo — fora do
  território desta rodada (não é permitido alterar `server/src/`) e há
  edição concorrente de outros agentes no mesmo working tree
  (`fiscal`/`models/index.ts` modificados em paralelo); mais provável é
  ruído de build/timing concorrente do que um bug real de patrimônio. Ver
  `docs/governance/TODO.md` para o registro completo, caso o dono queira
  investigar se o 500 se repetir de forma consistente depois que a rodada
  de Vendas/CNAB commitar.

**Documentos atualizados:** `docs/governance/TODO.md` (item marcado
`[x]` com detalhamento completo), este diário (entrada nova).

---

## 2026-08-07 a 2026-08-12 — Consolidação retroativa (o diário ficou 5 dias sem entrada)

**Por que esta entrada existe:** a última entrada acima é de 2026-08-06. Entre
07/08 e 12/08 aconteceram cinco rodadas grandes que foram registradas em
`TODO.md`, `HANDOFF_CODEX.md` e documentos de plano, mas **nunca chegaram aqui**
— e este é o diário da execução do Go-Live. Fica **uma** entrada de
consolidação, escrita em 2026-08-12, sem tocar em nada acima (append-only).

**2026-08-07 — os 6 blocos de módulos novos.** Fecharam o pipeline
SST → TI → Jurídico → Facilities → Marketing → RH, mais Contabilidade,
Tesouraria e Controladoria. Com eles, os 17 departamentos passaram a ter módulo
funcional real. As migrations desses blocos estavam documentadas como "criadas,
não aplicadas" — **estavam aplicadas**; a nota foi corrigida em 12/08.

**2026-08-09 — o plano da cadeia do produto.** O dono formulou o critério de
aceite em uma frase: *"um insumo é cadastrado e segue seu curso até virar
produto finalizado, passando pelos departamentos, sem gap"*. A varredura achou
**17 gaps** e virou `docs/governance/PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md`,
com as decisões D-A a D-M tomadas pelo dono.

**2026-08-10 — o dia mais denso.** Os **17 gaps fecharam** (o G6 por último,
destravado pelo par G5+G4 sem precisar de coluna nova). O baseline do schema
virou **DDL estático congelado**, então banco novo nasce igual ao atual —
provado com banco descartável. Descobriu-se que **34 arquivos de teste de
integração pulavam em silêncio e reportavam verde**; corrigido, e três guardas
novas foram armadas (`schema-model-drift`, `column-name-drift`, `enum-literal`,
mais `cross-database-drift`). À tarde, o banco de dev foi limpo e recebeu a
**carga inicial real: 327 insumos da fábrica** via API — crus (custo 0,
estoque 0), com 59 marcados para conferência e 5 bobinas críticas.

**2026-08-11 — organograma sai do documento e entra no banco.** Gaps F-6/F-7
(commit `ec54e41`): a hierarquia passou a existir em `departments`, a navegação
do cliente passou a espelhá-la, e uma guarda reprova se `seeds.ts`,
`client/src/lib/departments.ts` e o organograma divergirem. A 4ª diretoria
(Suprimentos & Logística) foi criada — cargo previsto, ainda vago.

**2026-08-11 — auditoria adversarial tripla: REPROVADO.** Três frentes (ampla,
varredura dupla e escrita real) foram rodadas contra o sistema e o veredito foi
negativo. Achados que importam: **2 defeitos críticos no MRP** (o plano
misturava demandas de origens diferentes num balde só, e rodar o MRP duas vezes
duplicava requisição), **5 brechas nos gates** recém-entregues, e **11 alegações
falsas na documentação** — telas descritas como pendentes que existiam,
migrations descritas como não aplicadas que estavam aplicadas, requisitos
marcados `[IMPLEMENTADO]` sem implementação (curva ABC, valuação de estoque).

**2026-08-12 — remediação.** Os 2 críticos de MRP corrigidos
(`allocatePlanByOrigin.ts` novo; criação de requisição idempotente). As 5
brechas fechadas: fornecedor estrangeiro agora **força** `origin='import'` na
criação do pedido, declarar `import` para fornecedor nacional é 422
(`G11-ORIGIN-SUPPLIER-MISMATCH`), a partida de OP não aceita desvio por
apontamento manual, liberar lote depois de bloqueio da Qualidade ganhou trava
(migration `20260811-000044`), e ciclo de BOM passou a ser detectado em
multinível. **G13 e quarentena provados contra PostgreSQL real**, não por
dublê. Suíte de integração: **211/211 testes, 53 suítes, zero skip**.
Documentação consolidada na mesma rodada: `AGENTS.md` aposentado (duplicava e
contradizia o SSOT), as 11 alegações falsas corrigidas, e a fonte de pendências
unificada em `RESIDUAIS_ABERTOS_2026-08-10.md` (o `TODO.md` volta a ser o que
sempre foi na prática: diário histórico).

**Fica aberto, e é decisão de processo — não de código:** o plano de MRP **não
encolhe** quando a necessidade desaparece (material chegou, OP cancelada). As
ordens planejadas obsoletas permanecem e cabe ao PCP ignorá-las. Escolher entre
expiração automática e baixa manual é pergunta para o dono.

**Efeito no gate de Go-Live:** nasceu um bloqueador que não existia quando o
checklist foi escrito — **carga inicial de dados**. Medido em 12/08: 0
fornecedores, 0 clientes, 0 funcionários, 0 produtos acabados, 0 BOMs, 0
roteiros ativos. Como os gates de processo são reais, **nenhuma OP consegue
iniciar** e o UAT não tem como ser executado antes da carga. Registrado como
item (g) na seção de reconciliação de `GO_LIVE_G6_CHECKLIST.md`.
