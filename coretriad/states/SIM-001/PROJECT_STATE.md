# PROJECT STATE — SIM-001

| Campo | Valor |
|---|---|
| Project ID | SIM-001 |
| Nome | Sala Livre — API de reserva de salas de reunião |
| Tipo | SIMULATION |
| Data de registro | 2026-08-13 |
| Estado atual | `READY_FOR_REMEDIATION` |
| State machine | `coretriad/states/STATE_MACHINE.md` |
| Event log | `coretriad/states/SIM-001/PROJECT_EVENT_LOG.md` |
| Skill em execução | `/coretriad-sim-close` |
| Referência normativa | `docs/coretriad/CORETRIAD_MASTER_SPEC.md` — Parte VII (Fases 5 e 10) |

## Descrição

Simulado real e completo de validação operacional do modelo CoreTriad.
Percurso planejado: IDEA → BUILD → AUDIT → FINDINGS → REMEDIATION →
RETEST (com 1 `RETEST_FAILED` proposital) → CLOSED.

## Observações

- Projeto de simulação: discovery, requisitos e arquitetura fazem parte do
  pacote OpusCore que será construído durante o exercício.
- Toda transição de estado deve seguir a tabela de autoridade da state
  machine e ser registrada no event log do projeto.
- Auditoria SIM-001-AUD-001 (AUDIT_COMMIT b736a1e733f802735b1b79348e3c6cc084bd466e)
  produziu 3 findings CONFIRMED: FIND-SIM-001-001 (CRITICAL, autorização de
  cancelamento), FIND-SIM-001-002 (HIGH, taxa de cancelamento tardio
  divergente da BR), FIND-SIM-001-003 (HIGH, TC-SIM-003 planejado ausente).
- Handoff formal para SanaCore feito via REMEDIATION_CASE em
  `coretriad/handoffs/SIM-001/` (SIM-001-CASE-001, -002, -003), sem
  dependência entre si (causas-raiz independentes). O
  `sanacore-remediation-triage` deve abrir os casos de trabalho em
  `remediation/cases/SIM-001-FIND-001/`, `.../SIM-001-FIND-002/` e
  `.../SIM-001-FIND-003/` a partir destes handoffs.
