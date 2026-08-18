# Remediation Inventory

Inventário inicial das pastas em `remediation/cases/`, limitado aos `CASE-XXX`.

| Case | TRIAGE.md | VERDICT_CASE-XXX.md | PENDING_DECISION.md | Resumo curto do TRIAGE |
|---|---|---|---|---|
| ERP-LEGACY-001-CASE-001 | sim | nao | nao | `# TRIAGE — ERP-LEGACY-001-CASE-001 (FIND-ERP-001, GRUPO B)` |
| ERP-LEGACY-001-CASE-002 | sim | nao | nao | `# TRIAGE — ERP-LEGACY-001-CASE-002 (FIND-ERP-005)` |
| ERP-LEGACY-001-CASE-003 | nao | nao | nao | `sem TRIAGE.md` |
| ERP-LEGACY-001-CASE-004 | nao | nao | nao | `sem TRIAGE.md` |
| ERP-LEGACY-001-CASE-005 | sim | nao | nao | `# TRIAGE — \`ERP-LEGACY-001-CASE-005\` (\`AUD-AUTHN-01\`)` |
| ERP-LEGACY-001-CASE-006 | nao | nao | nao | `sem TRIAGE.md` |
| ERP-LEGACY-001-CASE-007 | sim | sim | nao | `# TRIAGE — ERP-LEGACY-001-CASE-007` |
| ERP-LEGACY-001-CASE-008 | sim | nao | nao | `# TRIAGE — ERP-LEGACY-001-CASE-008` |
| ERP-LEGACY-001-CASE-009 | sim | nao | nao | `# TRIAGE — ERP-LEGACY-001-CASE-009` |
| ERP-LEGACY-001-CASE-010 | sim | nao | nao | `# TRIAGE — ERP-LEGACY-001-CASE-010` |
| ERP-LEGACY-001-CASE-011 | sim | nao | nao | `# TRIAGE — ERP-LEGACY-001-CASE-011` |
| ERP-LEGACY-001-CASE-012 | sim | nao | nao | `# TRIAGE — \`ERP-LEGACY-001-CASE-012\` (\`FIND-ERP-007\`)` |
| ERP-LEGACY-001-CASE-013 | sim | nao | nao | `# TRIAGE — ERP-LEGACY-001-CASE-013 (FIND-ERP-009)` |
| ERP-LEGACY-001-CASE-014 | sim | nao | nao | `# TRIAGE — \`ERP-LEGACY-001-CASE-014\` (\`AUD-ALOG-01\`, itens ...)` |
| ERP-LEGACY-001-CASE-015 | sim | nao | nao | `# TRIAGE — \`ERP-LEGACY-001-CASE-015\` · \`AUD-DB-01\`` |
| ERP-LEGACY-001-CASE-016 | sim | nao | nao | `# Triage — \`ERP-LEGACY-001-CASE-016\`` |
| ERP-LEGACY-001-CASE-017 | sim | nao | sim | `# CASE-017: POST /api/items com saldo sem movimento — TRIAGEM` |
| ERP-LEGACY-001-CASE-018 | sim | sim | sim | `# TRIAGE — \`ERP-LEGACY-001-CASE-018\` · \`AUD-AUTHN-02\`` |

## Observações

- `ERP-LEGACY-001-PRODUCAO-BLOCO-K` existe na pasta, mas não é um `CASE-XXX`, então ficou fora do inventário inicial.
- Os casos `CASE-017` e `CASE-018` já têm `PENDING_DECISION.md`; qualquer implementação futura nesses casos precisa respeitar as decisões formais registradas em governança.
