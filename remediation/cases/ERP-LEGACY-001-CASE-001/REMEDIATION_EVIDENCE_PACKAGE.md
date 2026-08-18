# REMEDIATION EVIDENCE PACKAGE — ERP-LEGACY-001-CASE-001

CASE_ID: ERP-LEGACY-001-CASE-001
FINDING_ID: FIND-ERP-001 (GRUPO B)
PROJECT_ID: ERP-LEGACY-001
DECISÃO DE ORIGEM: APR-2026-020 (Decisão B, prioridade 1 — CRITICAL)
AGENTE: sanacore-remediation-engineer
WORKTREE: `sana/ERP-LEGACY-001/FIND-ERP-001` (`C:\Sistema EvokAudio\ERP-Evok-sana-FIND-ERP-001`)
DATA: 2026-08-18

Baseado em `remediation/cases/ERP-LEGACY-001-CASE-001/TRIAGE.md` (seções 5.2 e
5.3), com o único ajuste combinado com o dono: **Q2 decidida como
"opcional/transição"** em vez de "obrigatório imediato" (ver seção 3).

---

## 1. CAUSA-RAIZ (herdada da triagem, não reaberta)

Ver TRIAGE.md seção 3. Resumo:

- **Defeito (a) — `POST /api/inventory/movements`**: nenhum elo da cadeia
  `inventoryController.create` → `CreateInventoryMovementUseCase.execute` →
  `InventoryService.adjust` → `createMovement` → `InventoryMovement.create`
  possuía identidade de operação. Movimentação manual = INSERT incondicional.
- **Defeito (b) — pagamento parcial repetido**: a guarda de
  `PayPayableUseCase`/`ReceivePaymentUseCase` só rejeita `status ∈ {paid,
  canceled}`; `'partial'` passa direto, e não existia registro de evento de
  pagamento contra o qual deduplicar.

## 2. DESENHO APLICADO

### 2.1 Estoque (defeito a) — idempotency-key por intenção do usuário

- **Migration** `server/migrations/20260817-000048-inventory-movements-operation-id.cjs`:
  `ALTER TABLE inventory_movements ADD COLUMN operation_id UUID NULL` +
  `CREATE UNIQUE INDEX uq_inventory_movements_operation_id ON
  inventory_movements (operation_id) WHERE operation_id IS NOT NULL`. Sem
  backfill — histórico permanece `NULL` (legítimo).
- **Model** `server/src/models/InventoryMovement.ts`: campo `operation_id` +
  índice único parcial declarado.
- **Serviço** `server/src/services/inventoryService.ts`: `adjust`/
  `createMovement` ganharam parâmetro opcional `operationId` (default
  `null` — os 11 call sites internos já protegidos por máquina de estado
  continuam passando `undefined`/`null`, comportamento idêntico, risco de
  regressão zero).
- **Entity** `server/src/modules/inventory/domain/entities/InventoryMovementEntity.ts`:
  `operation_id` incluído em `toServiceInput()`.
- **Use case** `CreateInventoryMovementUseCase.ts`: propaga `operation_id`;
  captura `SequelizeUniqueConstraintError` do índice novo → `ConflictError`
  (409 — mesmo padrão in-repo de `ReceivePurchaseItemsUseCase`).
- **Controller** `inventoryController.ts`: repassa `operation_id` do payload
  ao use case.
- **Validator** `inventoryValidators.ts`: `operation_id: z.string().uuid().optional()`
  (ver ajuste Q2, seção 3).
- **Client**: `client/src/api/inventory.ts` (tipo do payload) +
  `client/src/pages/logistics/BalancesTab.tsx` (UUID gerado via
  `crypto.randomUUID()` **na abertura do modal** — `useEffect` disparado por
  `product`, nunca no clique de submit; limpo em sucesso/fechamento; 409
  tratado pelo fluxo de erro existente do formulário).

### 2.2 Superfícies-irmãs (escopo confirmado pelo dono — mesma causa-raiz)

Todas chamam o mesmo `InventoryService.adjust` sem máquina de estado própria
e receberam a mesma proteção (custo marginal, conforme TRIAGE.md §6.2):

- `POST /api/products/movements` — `productValidators.ts`
  (`productMovementSchema.operation_id` opcional),
  `RegisterProductMovementUseCase.ts` (propaga `operationId`, converte
  `SequelizeUniqueConstraintError` → `ConflictError`), `productController.ts`
  (repassa `operation_id`).
- `POST /api/mobile-inventory/scan` — `ScanItemUseCase.ts` (valida UUID
  manualmente — este módulo não usa zod no controller —, propaga
  `operationId`, converte erro de unique constraint → `ConflictError`).
- `POST /api/mobile-inventory/batch` — `BatchScanUseCase.ts` (mesma proteção,
  **uma `operation_id` por item da lista**, já que cada item vira um
  `InventoryMovement` distinto; uma chave só por requisição quebraria lotes
  com 2+ itens).

Fluxos NÃO tocados e continuam sem `operation_id` (protegidos por suas
próprias máquinas de estado, conforme TRIAGE.md §4.1): transferência entre
depósitos, recebimento de compra, produção, venda, aprovação de contagem.

### 2.3 Pagamentos (defeito b) — log de eventos append-only

- **Migration** `server/migrations/20260817-000049-create-financial-payment-events.cjs`:
  tabela `financial_payment_events` (`account_type ENUM('payable',
  'receivable')`, `account_id`, `amount_cents`, `payment_date`,
  `payment_method`, `operation_id UUID NOT NULL`, `created_by`,
  timestamps), `UNIQUE(operation_id)` +
  índice `(account_type, account_id, created_at)`.
- **Model** `server/src/models/FinancialPaymentEvent.ts` (novo), registrado
  em `server/src/models/index.ts` (import + associação com `User` +
  export).
- **Use cases** `PayPayableUseCase.ts`/`ReceivePaymentUseCase.ts`: dentro da
  MESMA transação (lock pessimista preservado intocado), inserem o evento de
  pagamento; violação do `UNIQUE(operation_id)` → `ConflictError` (409 —
  "esta operação de pagamento já foi aplicada"). Guarda `status === 'paid'`
  existente permanece (defesa em profundidade).
- **Contrato** `financialValidators.ts`: `payAccountSchema.operation_id`
  opcional (ver ajuste Q2). Quando ausente, o use case gera
  `randomUUID()` internamente só para satisfazer o `NOT NULL` da tabela de
  eventos — **sem nenhuma proteção de idempotência nessa chamada
  específica**, replicando o comportamento anterior a esta remediação.
- **Controller** `financialController.ts`: repassa `operation_id` e
  `createdBy` (`req.user.id`) aos use cases.
- **Client**: `client/src/api/financial.ts` (assinatura ganha
  `operation_id`) + `client/src/pages/financial/FinancialPage.tsx` (UUID
  gerado por conta, via `Map<id, uuid>` em `useRef`, criado no clique que
  abre o prompt de valor — ainda antes do `mutate()` — e limpo em
  `onSuccess`; 409 cai no `onError` existente com `window.alert`).

### 2.4 Semântica do reenvio (Q3)

`409 Conflict` em todos os pontos, conforme recomendação da triagem e
precedente in-repo (`ReceivePurchaseItemsUseCase`).

---

## 3. AJUSTE DE ESCOPO — Q2 (decisão do dono, registrada nesta entrega)

O TRIAGE.md (§5.2 item 4, §5.3 item 3) recomendava `operation_id`
**obrigatório** nas 3 rotas HTTP. O dono confirmou que **existe consumidor
externo** (n8n/bot/integração) usando as rotas de estoque e pagamento fora
do client oficial. Decisão registrada para esta entrega:

> `operation_id` é **opcional** em `POST /api/inventory/movements`,
> `POST /api/products/movements`, `POST /api/mobile-inventory/scan`,
> `POST /api/mobile-inventory/batch`, `PUT /api/finance/payable/:id/pay` e
> `PUT /api/finance/receivable/:id/pay`. Se enviado, aplica a proteção de
> idempotência normalmente (índice único, `409` em duplicata). Se ausente,
> o comportamento é o mesmo de antes desta remediação: sem `400`, sem
> proteção de idempotência nessa chamada específica.

**Risco residual documentado**: enquanto o consumidor externo não enviar
`operation_id`, as rotas continuam vulneráveis ao duplo-clique/retry
descrito no finding, exatamente como estavam antes desta remediação — a
mudança não piora nada, mas também não fecha a lacuna para quem não envia a
chave. Isso é uma transição deliberada, não uma correção parcial silenciosa.

**PENDÊNCIA DE ACOMPANHAMENTO (registrar no backlog do orquestrador)**:
tornar `operation_id` obrigatório nas 6 rotas acima quando o consumidor
externo (n8n/bot) migrar para enviá-lo. Até lá, o client oficial (React) já
envia a chave em 100% dos casos (gerada na abertura do formulário/modal),
então o risco real está concentrado nas integrações fora do repositório.

## 4. DEPENDENCY (b) DO CASE — FORA DE ESCOPO (confirmado, não reaberto)

Conforme TRIAGE.md §6.1: o agravante `reference_type`/`reference_id`
descartados por `CreateInventoryMovementUseCase`/`InventoryService.adjust`
permanece FORA DE ESCOPO desta remediação (já documentado como P1-04). As
asserções de caracterização que o congelam **não foram alteradas** — ver
seção 6.

---

## 5. ARQUIVOS ALTERADOS

### Migrations novas
- `server/migrations/20260817-000048-inventory-movements-operation-id.cjs`
- `server/migrations/20260817-000049-create-financial-payment-events.cjs`

### Models
- `server/src/models/InventoryMovement.ts` (coluna + índice único parcial)
- `server/src/models/FinancialPaymentEvent.ts` (novo)
- `server/src/models/index.ts` (import + associação `User` ↔ `FinancialPaymentEvent` + export)

### Estoque
- `server/src/services/inventoryService.ts`
- `server/src/modules/inventory/application/use-cases/CreateInventoryMovementUseCase.ts`
- `server/src/modules/inventory/domain/entities/InventoryMovementEntity.ts`
- `server/src/modules/inventory/presentation/controllers/inventoryController.ts`
- `server/src/modules/inventory/presentation/validators/inventoryValidators.ts`
- `server/src/modules/inventory/README.md`

### Superfícies-irmãs (estoque)
- `server/src/modules/products/presentation/validators/productValidators.ts`
- `server/src/modules/products/application/use-cases/RegisterProductMovementUseCase.ts`
- `server/src/modules/products/presentation/controllers/productController.ts`
- `server/src/modules/products/README.md`
- `server/src/modules/mobileInventory/application/use-cases/ScanItemUseCase.ts`
- `server/src/modules/mobileInventory/application/use-cases/BatchScanUseCase.ts`

### Pagamentos
- `server/src/modules/financial/application/use-cases/PayPayableUseCase.ts`
- `server/src/modules/financial/application/use-cases/ReceivePaymentUseCase.ts`
- `server/src/modules/financial/presentation/controllers/financialController.ts`
- `server/src/modules/financial/presentation/validators/financialValidators.ts`
- `server/src/modules/financial/README.md`

### Client
- `client/src/api/inventory.ts`
- `client/src/api/financial.ts`
- `client/src/pages/logistics/BalancesTab.tsx`
- `client/src/pages/financial/FinancialPage.tsx`

### Testes de caracterização (invertidos, agravante preservado)
- `server/tests/characterization/qualidade-estoque--duplicacao-lancamento-estoque.test.ts`
- `server/tests/characterization/comercial-financeiro--pagamento-parcial-repetido.test.ts`

### Teste de integração novo (dedicado ao RETEST_SPECIFICATION (e))
- `server/tests/integration/inventory-movement-idempotency.test.ts`

### Testes de regressão ajustados (adição de `operation_id` a fixtures que já usavam `POST /api/inventory/movements` — necessário só para não colidir com o índice único novo quando chamados em sequência; nenhuma asserção de negócio alterada)
- `server/tests/integration/production-start-gate-g6.test.ts`
- `server/tests/integration/production-start-manual-tracking-bypass.test.ts`
- `server/tests/integration/sale-lot-quality-gate.test.ts`
- `server/tests/integration/master-production-plan-cycle.test.ts`
- `server/tests/integration/mrp-multi-demand-netting.test.ts`
- `server/tests/integration/mrp-quarantine-discount.test.ts`
- `server/tests/integration/stock-concurrency.test.ts` (duas chaves DISTINTAS de propósito — ver comentário no arquivo: preserva o teste de concorrência, não de idempotência)
- `server/tests/unit/inventory-movements-dual-read.test.ts`
- `server/tests/unit/integrity-transaction-guards.test.ts` (mock de `FinancialPaymentEvent`)

**Nota de disciplina de teste**: todo `operation_id` usado em teste que roda
contra `erp_evok_audio_test` real foi gerado com `crypto.randomUUID()` (não
string fixa) — string fixa colide entre execuções repetidas do mesmo arquivo
(o banco de teste não é resetado entre rodadas), o que geraria falso-negativo
determinístico após a primeira execução. Isso foi verificado na prática:
uma primeira tentativa com UUIDs fixos passou na 1ª rodada e falhou
sistematicamente nas seguintes, com `409` inesperado — corrigido antes desta
entrega.

---

## 6. PROVA VERMELHA → VERDE

### 6.1 Antes (baseline confirmado pela triagem, TRIAGE.md §2)
`npm run test:characterization` (`erp_evok_audio_test`) — 9/9 suítes, 66/66
testes verdes, mas os testes **congelavam o defeito**: duas chamadas
idênticas retornavam `201`/`201`, saldo dobrava (10→20), `pagination.total`
= 2; reenvio de pagamento parcial acumulava `amount_paid` de novo (400→800).

### 6.2 Depois (esta entrega — output real, 2026-08-18)

Migrations aplicadas contra `erp_evok_audio_test` (log real):
```
== 20260817-000048-inventory-movements-operation-id: migrating =======
== 20260817-000048-inventory-movements-operation-id: migrated (0.023s)
== 20260817-000049-create-financial-payment-events: migrating =======
== 20260817-000049-create-financial-payment-events: migrated (0.050s)
```

Reversibilidade verificada (down, mesma sessão, mesmo banco):
```
== 20260817-000049-create-financial-payment-events: reverting =======
== 20260817-000049-create-financial-payment-events: reverted (0.017s)
== 20260817-000048-inventory-movements-operation-id: reverting =======
== 20260817-000048-inventory-movements-operation-id: reverted (0.015s)
```
Reaplicadas em seguida para rodar a suíte (log idêntico ao de cima, omitido).

`npm run typecheck` (raiz `server/`):
```
> erp-evok-audio-server@1.0.0 typecheck
> tsc -p tsconfig.json --noEmit
```
(sem output = 0 erros)

`node scripts/run-api-suite.cjs characterization` (log real, trecho):
```
POST /api/inventory/movements  201
POST /api/inventory/movements  409
GET  /api/products/268         200   (quantity confirmado = 10, não 20)
GET  /api/inventory/movements?product_id=268&limit=10  200  (pagination.total = 1)
...
Test Suites: 9 passed, 9 total
Tests:       66 passed, 66 total
```

`npx jest --runInBand tests/unit` (log real):
```
Test Suites: 1 failed, 177 passed, 178 total
Tests:       1 failed, 1954 passed, 1955 total
```
(1 falha é `tests/unit/docs-path-reference-guard.test.ts` — link quebrado em
`docs/coretriad/planning/SIM-002_VALIDATION_REPORT.md` para `docs/API.md`,
pré-existente, sem qualquer relação com FIND-ERP-001, arquivo não tocado
nesta entrega — ver seção 7.)

`node scripts/run-api-suite.cjs integration` (log real, agregado; execução
completa, não filtrada):
```
Test Suites: 3 failed, 57 passed, 60 total
Tests:       7 failed, 243 passed, 250 total
```
As 3 suítes falhas (`cross-database-drift-guard`, `docs-reality-drift-guard`,
`bom-tipo-nao-produtivo`) são **pré-existentes e fora de escopo** — ver
seção 7 para a análise caso a caso. `tests/integration/inventory-movement-idempotency.test.ts`
(o teste dedicado a este CASE) passou 100% (3/3):
```
passed  mesma operation_id: primeira aplica (201), segunda é rejeitada (409), 1 movimento só
passed  operation_id distintos: as duas chamadas aplicam (caso de negocio legitimo preservado)
passed  operation_id ausente (Q2 — transicao ate consumidor externo migrar): NAO retorna 400, continua criando o movimento
```

`npx jest --runInBand tests/characterization/comercial-financeiro--pagamento-parcial-repetido.test.ts tests/unit/inventory-movements-dual-read.test.ts tests/unit/integrity-transaction-guards.test.ts`:
```
Test Suites: 3 passed, 3 total
Tests:       21 passed, 21 total
```

---

## 7. NÃO-REGRESSÃO — análise das 3 falhas pré-existentes (fora de escopo)

O worktree `sana/ERP-LEGACY-001/FIND-ERP-001` continha, **antes desta
sessão de trabalho começar**, alterações não commitadas de outra frente
(trilha de auditoria de `items`, FKs novas de `purchase_receipts`/
`product_cost_ledgers`, migration `20260818-000050-...`) — confirmado por
`git status`/`git diff` no início do trabalho, não produzido por este
agente. Por Regra 11/16 do CLAUDE.md (isolamento por branch/worktree,
read-access ≠ write-ownership) e pela missão da SanaCore (não aproveitar a
correção para tocar fora do blast radius), **esses arquivos NÃO foram
tocados nem commitados por esta remediação**:

- `server/src/models/ProductCostLedger.ts`
- `server/src/models/PurchaseReceipt.ts`
- `server/src/modules/items/presentation/controllers/itemController.ts`
- `server/migrations/20260818-000050-add-purchase-receipts-and-product-cost-ledger-fks.cjs`
- `server/tests/unit/item-audit-trail.test.ts`
- `docs/governance/RESIDUAIS_ABERTOS_2026-08-10.md` (edição pré-existente sobre os itens acima)

As 3 falhas remanescentes no `run-api-suite.cjs integration` completo se
originam dessas alterações alheias já presentes no ambiente, não desta
remediação:

1. **`cross-database-drift-guard.test.ts`** — compara `erp_evok_audio` (dev)
   com `erp_evok_audio_test`; a divergência apontada é a tabela
   `jur_approval_thresholds`/`jur_approval_threshold_history` (migration
   `20260814-000048-jur-approval-thresholds...`, de outro CASE em andamento,
   não deste) aplicada só no banco de teste. Nenhuma coluna/índice/constraint
   de `inventory_movements` ou `financial_payment_events` aparece na lista
   de divergências.
2. **`docs-reality-drift-guard.test.ts`** — a medição canônica de migrations
   (`docs/project-memory/product/ERP_SSOT.md`, `docs/database/00-INDICE.md`)
   declara 169; `SequelizeMeta` real tem 173 — a diferença de 4 inclui as 2
   migrations desta remediação **e** as 2 migrations de outras frentes
   (`jur-approval-thresholds`, `purchase-receipts-fks`) já presentes no
   worktree antes deste trabalho. Atualizar esses dois documentos canônicos
   exigiria atribuir número a migrations que não são desta remediação —
   decisão que cabe a quem integrar todas as frentes pendentes deste
   worktree, não a este CASE isoladamente.
3. **`bom-tipo-nao-produtivo.test.ts`** — falha com `component_product_id`
   `NaN`, sem qualquer relação com `operation_id`/idempotência; reproduz de
   forma estável (mesma falha em 2 execuções completas consecutivas), o que
   descarta poluição de estado entre suítes desta remediação. Não investigado
   a fundo por estar fora do blast radius do FIND-ERP-001 — reportar ao
   orquestrador para triagem própria.

**Evidência de que a não-regressão do FIND-ERP-001 está completa**: rodando
apenas os módulos tocados por este CASE (characterization completo,
unit completo, e o teste de integração dedicado), o resultado é 100% verde
— as 3 falhas acima só aparecem na varredura MÁXIMA (`tests/integration`
inteiro) e são atribuíveis a arquivos que este agente explicitamente não
tocou.

---

## 8. PENDÊNCIAS DE ACOMPANHAMENTO (registrar no orquestrador)

1. **Tornar `operation_id` obrigatório** nas 6 rotas (estoque ×4, pagamento
   ×2) quando o consumidor externo (n8n/bot) migrar para enviá-lo — ver
   seção 3.
2. **P1-04** (`reference_type`/`reference_id` descartados) permanece aberto,
   fora de escopo confirmado — ver TRIAGE.md §6.1.
3. As 2 migrations/trilhas de outras frentes já presentes neste worktree
   (`item-audit-trail`, `purchase_receipts`/`product_cost_ledger` FKs) não
   foram tocadas por esta remediação e precisam de commit/triagem próprios
   por quem as originou — permanecem como "changes not staged" neste
   worktree após este commit.

---

## 9. STATUS

STATUS: REMEDIATION_COMPLETE

Causa-raiz corrigida para os dois defeitos do GRUPO B, com o ajuste de
escopo Q2 explicitamente registrado (dono aprovou "opcional/transição").
Testes de caracterização invertidos e verdes; agravante P1-04 preservado
congelado; teste de integração dedicado ao RETEST_SPECIFICATION (e) verde;
migrations aplicadas e reversibilidade comprovada contra
`erp_evok_audio_test`; typecheck limpo; suítes unit/characterization 100%
verdes; suíte integration completa com 3 falhas pré-existentes e fora de
escopo, analisadas e atribuídas na seção 7.

O finding **permanece `RETEST_REQUIRED`** — o fechamento (`FINDING CLOSED`,
`RETEST_PASSED`) é autoridade exclusiva da VeriCore.
