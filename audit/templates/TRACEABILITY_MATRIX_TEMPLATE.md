# TRACEABILITY_MATRIX — Matriz de Rastreabilidade

Artefato central mantido pelo `traceability-auditor`. Todo BR/REQ/UC crítico deve ter uma linha. Qualquer célula vazia
ou marcada com ❌ em um item crítico gera um finding automático de rastreabilidade (`AUD-TRACE-xxxx`).

| Processo | Regra (BR) | Requisito (REQ) | Caso de Uso (UC) | Aceite (AC) | Código | Teste (TC) | Permissão (PERM) | Evidência |
|---|---|---|---|---|---|---|---|---|
| PROC-COM-001 | BR-FIN-003 | REQ-FIN-010 | UC-FIN-004 | AC-FIN-004 | PaymentService.validatePayment() | ❌ AUSENTE | PERM-PAYMENT | audit/runs/&lt;AUDIT-ID&gt;/21-findings/evidence/... |
| ... | ... | ... | ... | ... | ... | ... | ... | ... |

## Como usar

1. Preencha uma linha por elo crítico (não é preciso rastrear 100% do sistema — priorize por risco/criticidade).
2. Toda célula preenchida deve ser verificável (arquivo/linha, ID de documento, ID de teste) — não aceitar texto livre
   sem localização.
3. Uma célula `❌ AUSENTE` em qualquer coluna de um item CRITICAL/HIGH gera automaticamente um finding.
4. Esta matriz alimenta o `AUDIT_COVERAGE_MATRIX` e o Relatório Técnico final.
