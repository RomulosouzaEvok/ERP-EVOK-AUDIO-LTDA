# 02-plan — ERP-LEGACY-001-AUD-001 (estágio pendente — TERMINA EM GATE HUMANO)

Estágio 3 do ciclo (`audit/framework/AUDIT_PROCESS.md` §4): `AUDIT_PLAN.md`
produzido pelo `vericore-audit-planning-agent` com o
`vericore-software-audit-director`.

Vínculos obrigatórios definidos pelo escopo (`00-scope/AUDIT_SCOPE.md`):

1. **Tiers do §4 são decisão humana (APR-2026-020)** — o plano distribui
   profundidade dentro deles, não os inverte.
2. **Restrição de conflito (§8 item 3):** autor de finding preliminar não
   reexamina o próprio achado como voz única no fieldwork.
3. **Regime de dado real (§5, APR-2026-016):** nenhuma trilha planeja
   execução contra banco real; evidência dinâmica só via
   `vericore-audit-verification-runner` + `erp_evok_audio_test`.

**GATE:** o fieldwork NÃO está autorizado. `/audit-fieldwork` exige aprovação
humana do `AUDIT_PLAN.md` registrada em `coretriad/governance/APPROVALS.md`
(Regra 18). As pastas de fieldwork (`07-`, `21-`, `24-`, `30-`, `31-`) serão
criadas somente após essa aprovação.
