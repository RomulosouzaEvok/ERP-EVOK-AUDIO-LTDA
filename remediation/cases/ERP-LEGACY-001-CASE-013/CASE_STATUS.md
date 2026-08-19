# CASE_STATUS - ERP-LEGACY-001-CASE-013

```text
CASE_ID:   ERP-LEGACY-001-CASE-013
FINDING:   FIND-ERP-009
BRANCH:    sana/ERP-LEGACY-001/CASE-013
STATUS:    IN_PROGRESS
```

## Situacao Atual

- Fase 1 concluida: identidade gravada em MPS, BOM, contas a pagar/receber e tesouraria.
- Fase 2A concluida nesta continuacao: segregacao de funcao em `POST /api/ti/access-requests/:id/approve` e `POST /api/ti/access-requests/:id/reject`, comparando `requested_by` contra o aprovador/rejeitador autenticado.
- Evidencia da Fase 2A: `REMEDIATION_EVIDENCE_CONTINUATION_2026-08-19.md`.
- Fase 2B concluida nesta continuacao: segregacao de funcao em `PATCH /api/accounting/entries/:id/post` e `PATCH /api/accounting/entries/:id/reverse`, bloqueando o criador do lancamento e tambem o usuario que postou o original no caminho de estorno.
- Evidencia da Fase 2B: `REMEDIATION_EVIDENCE_CONTINUATION_2026-08-19.md`.
- Fase 2C concluida nesta continuacao: segregacao de funcao em `PUT /api/inventory/transfers/:id/approve` e `PUT /api/inventory/transfers/:id/reject`, usando `warehouse_transfers.user_id` como solicitante.
- Evidencia da Fase 2C: `REMEDIATION_EVIDENCE_CONTINUATION_2026-08-19.md`.
- Fase 2 segue em aberto para os demais pontos com campo de solicitante ja existente.
- Fases 3 a 7 ainda pendentes.

## Validacao Ja Executada

- `npx jest server/tests/unit/master-production-plan-g17.test.ts server/tests/unit/bom-engineering-change-control-g1.test.ts server/tests/unit/integrity-transaction-guards.test.ts server/tests/unit/treasury-use-cases.test.ts --runInBand`
- `npx jest server/tests/unit/rbac-critical-routes.test.ts --runInBand --testTimeout=20000`
- `npm test -- --runInBand tests/unit/ti-access-request-use-cases.test.ts` -> 1 suite, 12 tests passed.
- `npm test -- --runInBand tests/unit/accounting-use-cases.test.ts` -> 1 suite, 24 tests passed.
- `npm test -- --runInBand tests/unit/warehouse-stock.test.ts` -> 1 suite, 37 tests passed.
- `npm run typecheck`
- `npm run build`

## Observacoes

- Nenhuma conexao de banco real foi aberta nesta subentrega.
- P19 permanece pendente: ate o dono indicar segundo aprovador por modulo, o usuario admin pode ficar bloqueado nos pontos em que a segregacao for aplicada. Isso e esperado pelo despacho, nao bug.
- `REMEDIATION_COMPLETE` nao e declarado porque o case inteiro ainda nao terminou.
