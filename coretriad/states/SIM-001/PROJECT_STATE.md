# PROJECT STATE — SIM-001

| Campo | Valor |
|---|---|
| Project ID | SIM-001 |
| Nome | Sala Livre — API de reserva de salas de reunião |
| Tipo | SIMULATION |
| Data de registro | 2026-08-13 |
| Estado atual | `IN_DEVELOPMENT` |
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
