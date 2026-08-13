# CORETRIAD — AUTHORITY MATRIX

| Recurso / Ação | OpusCore | VeriCore | SanaCore | CoreTriad | Humano |
|---|---|---|---|---|---|
| product/, src/, tests/ (escrita) | ✓ (build) | ✗ | ✓ só em worktree sana/ | ✗ | — |
| requirements/, architecture/ (escrita) | ✓ | ✗ | atualização pós-correção | ✗ | aprova R2/R3 |
| audit/, audit/runs/ (escrita) | ✗ | ✓ (via evidence-controller) | ✗ | ✗ | — |
| Finding original (edição) | ✗ | ✓ | ✗ (cria remediation-response) | ✗ | — |
| remediation/ (escrita) | ✗ | ✗ | ✓ | ✗ | — |
| coretriad/ states/locks/contracts | ✗ | ✗ | ✗ | ✓ | — |
| IMPLEMENTATION COMPLETE | ✓ | ✗ | ✗ | ✗ | — |
| AUDIT PASSED / FINDING CONFIRMED | ✗ | ✓ | ✗ | ✗ | — |
| REMEDIATION COMPLETE | ✗ | ✗ | ✓ | ✗ | — |
| RETEST_PASSED / FINDING CLOSED | ✗ | ✓ | ✗ | ✗ | — |
| RISK_ACCEPTED | ✗ | ✗ | ✗ | ✗ | ✓ |
| Release para produção | ✗ | ✗ | ✗ | recomenda | ✓ aprova |
| Exceção de segurança | ✗ | recomenda | ✗ | ✗ | ✓ |

Read access ≠ write ownership. Ler é amplo; escrever é restrito ao namespace.
