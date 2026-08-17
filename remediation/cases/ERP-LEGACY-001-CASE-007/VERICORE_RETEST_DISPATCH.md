# Despacho de reteste VeriCore - ERP-LEGACY-001-CASE-007

```
CASE_ID:             ERP-LEGACY-001-CASE-007
FINDING_ID:          AUD-AUTHN-03
BRANCH:              sana/ERP-LEGACY-001/CASE-007
AUDIT_COMMIT:        c1311a6f76b512fef893f7e60d934179cae3409f
REMEDIATION_COMMIT:  PENDING_COMMIT
STATUS:              READY_FOR_VERICORE_RETEST_AFTER_SECOND_OPINION
```

## Escopo do reteste

Verificar independentemente se a remediacao de AUD-AUTHN-03 elimina o controle de particionamento pelo atacante no rate limiter e preserva operacao legitima.

## Evidencias entregues pela SanaCore

- `remediation/cases/ERP-LEGACY-001-CASE-007/REMEDIATION_EVIDENCE_PACKAGE.md`
- `server/tests/unit/case007-rate-limit-source.test.ts`
- `server/tests/unit/case007-rate-limit-policy.test.ts`

## Checks minimos sugeridos

- Reexecutar os testes CASE-007 contra o `AUDIT_COMMIT` em arvore temporaria e confirmar falha.
- Reexecutar os testes CASE-007 no `REMEDIATION_COMMIT` e confirmar sucesso.
- Reexecutar testes existentes de auth/refresh afetados.
- Confirmar que `server/app.ts` nao contem `jwt.decode` nem `app.use('/api/auth/refresh', ...)` antes de `authenticate`.
- Confirmar que a cota por IP e `1600/min/IP`.
- Confirmar que a cota por usuario autenticado e `300/15min/usuario`.
- Confirmar que 429 emite log `rate_limit_exceeded`.
- Confirmar comportamento de proxy conforme `TRUST_PROXY` ja existente.

## Pendencia declarada para reteste

O typecheck mobile nao foi executado conclusivamente pela SanaCore porque `mobile npm ci` falhou com `EUSAGE`: `mobile/package.json` e `mobile/package-lock.json` estao fora de sincronia no baseline da worktree. A VeriCore deve:

- reconciliar/aprovar o lockfile mobile antes do gate, ou
- registrar que o reteste mobile permanece bloqueado por prerequisito de ambiente/dependencias.

## Limites de autoridade

Este despacho nao declara resultado de reteste nem fechamento do finding. O veredito permanece com a VeriCore.
