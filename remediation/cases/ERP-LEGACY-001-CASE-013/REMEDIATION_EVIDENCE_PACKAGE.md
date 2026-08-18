# REMEDIATION_EVIDENCE_PACKAGE â€” `ERP-LEGACY-001-CASE-013`

```
CASE_ID:   ERP-LEGACY-001-CASE-013
FINDING:   FIND-ERP-009
BRANCH:    sana/ERP-LEGACY-001/CASE-013
HEAD:      2747b05
STATUS:    PARTIAL â€” FASE 1 CONCLUIDA
```

## Escopo executado

Nesta rodada, executei somente a subentrega de identidade do case:

- `masterProduction` â€” gravar `created_by` no MPS.
- `bom` â€” aprovar BOM com `approverUserId`, escrevendo `approved_by` e `approval_date`.
- `financial` â€” escrever `approved_by`/`approval_date` no recebimento e no pagamento.
- `treasury` â€” escrever `created_by`, `settled_by` e `canceled_by`.

O restante do `CASE-013` permanece pendente:

- `accessProfiles` / `users` â€” fora desta subentrega.
- `employees` / `items` â€” jÃ¡ tratados em outros casos, nÃ£o reimplementados aqui.
- `categories` / `departments` â€” dependem de `CASE-014`.
- `webhooks` / `mobileInventory` â€” seguem como exceÃ§Ãµes arquiteturais.

## FILES_AFFECTED

Resumo do diff atual:

```text
server/src/models/AccountReceivable.ts                            |  6 +++++-
server/src/models/MasterProductionPlan.ts                         |  5 ++++-
server/src/models/TreasuryFinancialOperation.ts                   |  6 ++++++
server/src/models/index.ts                                        | 13 +++++++++++++
server/src/modules/bom/application/use-cases/ApproveBOMUseCase.ts |  4 ++--
server/src/modules/financial/application/use-cases/PayPayableUseCase.ts  | 5 ++++-
server/src/modules/financial/application/use-cases/ReceivePaymentUseCase.ts | 5 ++++-
server/src/modules/financial/presentation/controllers/financialController.ts | 8 ++++++--
server/src/modules/masterProduction/application/use-cases/CreateMasterProductionPlanUseCase.ts | 1 +
server/src/modules/treasury/application/use-cases/operation/CancelOperationUseCase.ts | 6 +++---
server/src/modules/treasury/application/use-cases/operation/CreateOperationUseCase.ts | 2 ++
server/src/modules/treasury/application/use-cases/operation/SettleOperationUseCase.ts | 6 +++---
server/src/modules/treasury/presentation/controllers/financialOperationController.ts | 8 +++++---
server/tests/unit/bom-engineering-change-control-g1.test.ts | 9 ++++++---
server/tests/unit/integrity-transaction-guards.test.ts      | 6 ++++++
server/tests/unit/master-production-plan-g17.test.ts        | 2 +-
server/tests/unit/treasury-use-cases.test.ts                | 13 +++++++------
server/migrations/20260818-000052-add-mps-created-by.cjs
server/migrations/20260818-000053-add-financial-operation-actors.cjs
```

## Causa-raiz e correÃ§Ã£o por Ã¡rea

### 1) MPS

`server/src/modules/masterProduction/application/use-cases/CreateMasterProductionPlanUseCase.ts:69,204`

- Causa-raiz: o plano era criado com `planner_id`, mas o model precisava da
  trilha adicional `created_by`.
- CorreÃ§Ã£o: persistir `created_by = input.plannerId`.
- Teste: `server/tests/unit/master-production-plan-g17.test.ts:366`.

### 2) BOM

`server/src/modules/bom/application/use-cases/ApproveBOMUseCase.ts:40,58`

- Causa-raiz: aprovaÃ§Ã£o isolada nÃ£o recebia identidade e nÃ£o escrevia o
  aprovador no caminho de aprovaÃ§Ã£o.
- CorreÃ§Ã£o: exigir `approverUserId` e gravar `approved_by` + `approval_date`.
- Teste: `server/tests/unit/bom-engineering-change-control-g1.test.ts:121-135`.

### 3) Financeiro

`server/src/modules/financial/application/use-cases/ReceivePaymentUseCase.ts:40,72-73`
`server/src/modules/financial/application/use-cases/PayPayableUseCase.ts:40,72-73`
`server/src/modules/financial/presentation/controllers/financialController.ts:68,184`

- Causa-raiz: o recebimento/pagamento registravam o status, mas nÃ£o a
  identidade do usuÃ¡rio que executou a aÃ§Ã£o.
- CorreÃ§Ã£o: o controller passa `req.user.id` e o use case escreve
  `approved_by` + `approval_date`.
- Teste: `server/tests/unit/integrity-transaction-guards.test.ts:155-219`.

### 4) Tesouraria

`server/src/modules/treasury/application/use-cases/operation/CreateOperationUseCase.ts:23,48-59`
`server/src/modules/treasury/application/use-cases/operation/SettleOperationUseCase.ts:16,30-41`
`server/src/modules/treasury/application/use-cases/operation/CancelOperationUseCase.ts:19,33-42`
`server/src/modules/treasury/presentation/controllers/financialOperationController.ts:73,119,145`
`server/src/models/TreasuryFinancialOperation.ts:37-70`
`server/src/models/index.ts:715-720`

- Causa-raiz: a entidade nÃ£o tinha campos de autoria e as transiÃ§Ãµes de
  estado nÃ£o registravam quem criou, liquidou ou cancelou.
- CorreÃ§Ã£o: adicionar `created_by`, `settled_by`, `canceled_by`, propagar os
  IDs do JWT e amarrar as associaÃ§Ãµes em `models/index.ts`.
- Teste: `server/tests/unit/treasury-use-cases.test.ts:108-197`.

## Prova vermelha

Antes dos ajustes nos testes, a bateria unitÃ¡ria retornou uma falha em BOM:

```text
FAIL tests/unit/bom-engineering-change-control-g1.test.ts
  â€¢ G1 - ativar uma revisao rebaixa a anterior â€¦ aprovacao isolada tambem rebaixa a vigente anterior

    Expected
    - Object {}
    + Object {
    +   "approval_date": "2026-08-18",
    +   "approved_by": undefined,
    + }
```

Isso mostrava que o teste ainda travava o comportamento antigo. Depois da
atualizaÃ§Ã£o do input/asserÃ§Ã£o, o caso ficou verde.

## Prova verde

### Testes unitÃ¡rios da subentrega

```text
Test Suites: 4 passed, 4 total
Tests:       77 passed, 77 total
Time:        0.451 s
```

### Guardas de rota/controle

```text
Test Suites: 1 passed, 1 total
Tests:       18 passed, 18 total
Time:        2.949 s
```

### Typecheck

```text
> erp-evok-audio-server@1.0.0 typecheck
> tsc -p tsconfig.json --noEmit
```

### Build

```text
> erp-evok-audio-server@1.0.0 build
> tsc -p tsconfig.build.json
```

## Varredura de privacidade

Nesta subentrega nÃ£o houve `oldValues`/`newValues` novos em trilha de auditoria;
logo nÃ£o foi introduzido dado sensÃ­vel em JSON de auditoria. A alteraÃ§Ã£o foi
restrita a IDs internos e datas de processo:

- `created_by`
- `approved_by`
- `approval_date`
- `settled_by`
- `canceled_by`

Nenhum CPF, dado bancÃ¡rio, salÃ¡rio, endereÃ§o pessoal ou e-mail pessoal foi
adicionado a esta subentrega.

## Conformidade com APR-2026-016

Nenhuma conexÃ£o com `erp_evok_audio` foi aberta.
Nenhuma conexÃ£o com banco de teste foi necessÃ¡ria para esta subentrega.

## Estado

`REMEDIATION_COMPLETE` nÃ£o Ã© declarado aqui, porque o `CASE-013` completo
ainda estÃ¡ em andamento.
