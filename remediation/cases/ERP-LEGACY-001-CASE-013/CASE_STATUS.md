# CASE_STATUS â€” `ERP-LEGACY-001-CASE-013`

```
CASE_ID:   ERP-LEGACY-001-CASE-013
FINDING:   FIND-ERP-009
BRANCH:    sana/ERP-LEGACY-001/CASE-013
HEAD:      2747b05
STATUS:    IN_PROGRESS
```

## SituaÃ§Ã£o atual

- Fase 1 concluÃ­da: identidade gravada em MPS, BOM, contas a pagar/receber
  e tesouraria.
- Fase 2 em aberto: segregaÃ§Ã£o de funÃ§Ã£o nos pontos com campo de solicitante
  jÃ¡ existente.
- Fases 3 a 7 ainda pendentes.

## ValidaÃ§Ã£o jÃ¡ executada

- `npx jest server/tests/unit/master-production-plan-g17.test.ts server/tests/unit/bom-engineering-change-control-g1.test.ts server/tests/unit/integrity-transaction-guards.test.ts server/tests/unit/treasury-use-cases.test.ts --runInBand`
- `npx jest server/tests/unit/rbac-critical-routes.test.ts --runInBand --testTimeout=20000`
- `npm run typecheck`
- `npm run build`

## ObservaÃ§Ãµes

- Nenhuma conexÃ£o de banco real foi aberta nesta subentrega.
- `REMEDIATION_COMPLETE` nÃ£o Ã© declarado porque o case inteiro ainda nÃ£o
  terminou.
