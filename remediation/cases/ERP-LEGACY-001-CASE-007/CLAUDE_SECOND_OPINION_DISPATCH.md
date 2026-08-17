# Despacho de segunda opiniao Claude Code - ERP-LEGACY-001-CASE-007

```
CASE_ID:             ERP-LEGACY-001-CASE-007
FINDING_ID:          AUD-AUTHN-03
BRANCH:              sana/ERP-LEGACY-001/CASE-007
AUDIT_COMMIT:        c1311a6f76b512fef893f7e60d934179cae3409f
REMEDIATION_COMMIT:  ef4b8457a686347ca9ef9d39f0264197ffee19d9
ENGINE_TO_REVIEW:    Claude Code
STATUS:              READY_FOR_SECOND_OPINION
```

## Objetivo

Revisar a remediacao SanaCore implementada por Codex para confirmar se o patch fecha os vetores V1/V2/V2b/V3 descritos na triagem sem introduzir regressao de autenticacao, rate-limit ou operacao legitima atras de NAT.

## Leitura recomendada

- `remediation/cases/ERP-LEGACY-001-CASE-007/TRIAGE.md`
- `remediation/cases/ERP-LEGACY-001-CASE-007/REMEDIATION_EVIDENCE_PACKAGE.md`
- Diff do `REMEDIATION_COMMIT`

## Foco da revisao

- Confirmar que nenhuma chave de rate-limit ativa deriva de token JWT nao verificado.
- Confirmar que D1 esta implementado como `1600/min/IP`.
- Confirmar que D2 esta implementado como camada combinada: IP mais usuario autenticado `300/15min`.
- Confirmar que `/api/auth/refresh` nao consome cota de usuario por token forjado antes de `authenticate`.
- Confirmar que 429 gera log observavel.
- Confirmar que os testes novos reprovam o `AUDIT_COMMIT` e passam no patch.
- Avaliar o wrapper assincrono de `express-rate-limit` em `applyAuthenticatedRateLimits`, especialmente preservacao de `next`, 429 e mocks de `res.json`.
- Confirmar que a lacuna mobile esta corretamente declarada e nao mascarada como gate executado.

## Restricoes

- Somente revisao; nao declarar fechamento do finding nem resultado de reteste.
- Nao acessar banco de producao.
- Nao editar `audit/`, `coretriad/`, `coretriad/states/`, `coretriad/governance/` ou `.claude/`.

## Saida esperada

Persistir parecer em:

`remediation/cases/ERP-LEGACY-001-CASE-007/CLAUDE_SECOND_OPINION.md`

Veredito sugerido:

`SEGUNDA_OPINIAO_CONCORDA | SEGUNDA_OPINIAO_CONCORDA_COM_RESSALVA | SEGUNDA_OPINIAO_DIVERGE | INCONCLUSIVO`
