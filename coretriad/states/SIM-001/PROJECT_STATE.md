# PROJECT STATE — SIM-001

| Campo | Valor |
|---|---|
| Project ID | SIM-001 |
| Nome | Sala Livre — API de reserva de salas de reunião |
| Tipo | SIMULATION |
| Data de registro | 2026-08-13 |
| Estado atual | `RETEST_PASSED` |
| Última atualização | 2026-08-13 13:35 |
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
- Remediação executada pela SanaCore em worktrees isolados
  (`sana/SIM-001/FIND-001|002|003`) a partir do AUDIT_COMMIT `b736a1e`.
  REMEDIATION_COMMITs v1: `3ca9dd9` (FIND-001), `0e76a1c` (FIND-002),
  `8297779` (FIND-003).
- Loop de falha exercitado conforme planejado: FIND-SIM-001-001 v1 foi
  reprovado pela VeriCore no item (c) do RETEST_SPECIFICATION (admin não
  conseguia cancelar reserva de terceiro) → `RETEST_FAILED` → nova
  remediação SanaCore v2 (`08b4323`, suíte 9/9) → `RETEST_PASSED`.
- Estado `RETEST_PASSED` declarado pelo `vericore-software-audit-director`
  (única autoridade, Regra 4): FIND-SIM-001-001 v2, FIND-SIM-001-002 e
  FIND-SIM-001-003 aprovados e `CLOSED`. Evidência:
  `audit/runs/SIM-001-AUD-001/30-retest/RETEST_REPORT.md`.

## Bloqueios para `READY_FOR_RELEASE` (transição #18 NÃO executada)

O CoreTriad Director tem autoridade sobre a transição
`RETEST_PASSED → READY_FOR_RELEASE` (#18), mas ela permanece **NÃO
executada** pelos seguintes motivos registrados:

1. **Auditoria do run ainda não encerrada.** O
   `vericore-software-audit-director` não declarou `AUDIT_PASSED` para
   SIM-001-AUD-001: FIND-SIM-001-004, -005 e -006 seguem em status
   `PROPOSED` e a `AUDIT_COVERAGE_MATRIX` do run não foi emitida.
   `RETEST_PASSED` cobre apenas os 3 findings remediados — não substitui o
   encerramento do run de auditoria.
2. **Observações novas abertas.** Há 3 observações registradas em
   `audit/runs/SIM-001-AUD-001/31-new-findings/NEW_OBSERVATIONS.md`, das
   quais **OBS-SIM-001-A** (`userRole` autodeclarado pelo cliente) foi
   escalada para **decisão humana** — human gate aberto (Regra 18: só
   decisão humana explícita registrada em
   `coretriad/governance/APPROVALS.md` resolve).

**Nota de escopo:** SIM-001 é projeto de validação do modelo operacional
CoreTriad. **Não haverá release real** — as transições #19 (`RELEASED`),
#20 e #21 não se aplicam a este projeto e não devem ser executadas.
