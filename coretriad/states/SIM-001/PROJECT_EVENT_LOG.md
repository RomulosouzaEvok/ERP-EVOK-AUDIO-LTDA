# PROJECT EVENT LOG — SIM-001 (Sala Livre)

State machine: `coretriad/states/STATE_MACHINE.md`

| timestamp | from | to | actor | organization | reason | artifact/evidence |
|---|---|---|---|---|---|---|
| 2026-08-13 09:00 | — | IDEA_RECEIVED | coretriad-director | CORETRIAD | Registro do simulado de validação SIM-001 (Sala Livre) — Parte VII, Fases 5 e 10 da MASTER_SPEC | `coretriad/states/SIM-001/PROJECT_STATE.md` |
| 2026-08-13 09:05 | IDEA_RECEIVED | DISCOVERY | coretriad-director | CORETRIAD | Simulado de validação — discovery faz parte do pacote OpusCore a ser construído | `coretriad/states/SIM-001/PROJECT_STATE.md` |
| 2026-08-13 09:10 | DISCOVERY | REQUIREMENTS | coretriad-director | CORETRIAD | Simulado de validação — requisitos serão produzidos pela OpusCore no pacote de build | `coretriad/states/SIM-001/PROJECT_STATE.md` |
| 2026-08-13 09:15 | REQUIREMENTS | ARCHITECTURE | coretriad-director | CORETRIAD | Simulado de validação — arquitetura faz parte do pacote OpusCore a ser construído | `coretriad/states/SIM-001/PROJECT_STATE.md` |
| 2026-08-13 09:20 | ARCHITECTURE | READY_FOR_BUILD | coretriad-director | CORETRIAD | Simulado de validação — pacote liberado para build OpusCore no exercício | `coretriad/states/SIM-001/PROJECT_STATE.md` |
| 2026-08-13 09:25 | READY_FOR_BUILD | IN_DEVELOPMENT | coretriad-director | CORETRIAD | Simulado de validação — OpusCore acionada para construir o pacote (Sala Livre) | `coretriad/states/SIM-001/PROJECT_STATE.md` |
| 2026-08-13 10:30 | FINDINGS_CONFIRMED | READY_FOR_REMEDIATION | coretriad-director | CORETRIAD | 3 findings CONFIRMED (1 CRITICAL, 2 HIGH) — handoff formal para SanaCore via REMEDIATION_CASE | `coretriad/handoffs/SIM-001/REMEDIATION_CASE-SIM-001-CASE-001.md`, `coretriad/handoffs/SIM-001/REMEDIATION_CASE-SIM-001-CASE-002.md`, `coretriad/handoffs/SIM-001/REMEDIATION_CASE-SIM-001-CASE-003.md` |
| 2026-08-13 10:45 | READY_FOR_REMEDIATION | IN_REMEDIATION | sanacore-remediation-engineer | SANACORE | Transição #12 — 3 REMEDIATION_CASE assumidos em worktrees isolados `sana/SIM-001/FIND-001`, `sana/SIM-001/FIND-002`, `sana/SIM-001/FIND-003` | Branches criados a partir do AUDIT_COMMIT `b736a1e` |
| 2026-08-13 11:20 | IN_REMEDIATION | READY_FOR_RETEST | sanacore-remediation-evidence | SANACORE | Transição #13 — 3 REMEDIATION_EVIDENCE_PACKAGE entregues | REMEDIATION_COMMITs `3ca9dd9` (FIND-001 v1), `0e76a1c` (FIND-002), `8297779` (FIND-003) |
| 2026-08-13 11:30 | READY_FOR_RETEST | IN_RETEST | vericore-software-audit-director | VERICORE | Transição #14 — reteste independente com reprodução dinâmica pelo `vericore-audit-verification-runner` | `audit/runs/SIM-001-AUD-001/30-retest/` |
| 2026-08-13 12:05 | IN_RETEST | RETEST_FAILED | vericore-software-audit-director | VERICORE | Transição #16 — FIND-SIM-001-001 v1 reprovado no item (c) do RETEST_SPECIFICATION (admin não conseguia cancelar reserva de terceiro) | `audit/runs/SIM-001-AUD-001/30-retest/RETEST_REPORT.md` |
| 2026-08-13 12:15 | RETEST_FAILED | IN_REMEDIATION | coretriad-director + sanacore | CORETRIAD | Transição #17 — loop de falha acionado, SanaCore v2 | `audit/runs/SIM-001-AUD-001/30-retest/RETEST_REPORT.md` |
| 2026-08-13 12:50 | IN_REMEDIATION | READY_FOR_RETEST | sanacore-remediation-engineer | SANACORE | Transição #13 — v2 com caminho admin implementado | REMEDIATION_COMMIT `08b4323`, suíte 9/9 |
| 2026-08-13 13:00 | READY_FOR_RETEST | IN_RETEST | vericore-software-audit-director | VERICORE | Transição #14 — reteste da v2 | `audit/runs/SIM-001-AUD-001/30-retest/` |
| 2026-08-13 13:30 | IN_RETEST | RETEST_PASSED | vericore-software-audit-director | VERICORE | Transição #15 — FIND-SIM-001-001 v2, FIND-SIM-001-002 e FIND-SIM-001-003 aprovados; 3 findings CLOSED | `audit/runs/SIM-001-AUD-001/30-retest/RETEST_REPORT.md` + os 3 finding files com STATUS `CLOSED` |
| 2026-08-13 13:50 | — (human gate) | — (human gate) | Gilwagno (humano) | HUMAN | `RISK_ACCEPTED` para OBS-SIM-001-A — risco aceito restrito ao escopo do simulado SIM-001; diretriz permanente criada para projetos reais (Regra 24 do CLAUDE.md). Não é transição da state machine: estado do projeto permanece `RETEST_PASSED` | `coretriad/governance/APPROVALS.md` APR-2026-005 + `audit/runs/SIM-001-AUD-001/31-new-findings/NEW_OBSERVATIONS.md` |
| 2026-08-13 13:55 | — (human gate) | — (human gate) | Gilwagno (humano) | HUMAN | FIND-SIM-001-004, FIND-SIM-001-005 e FIND-SIM-001-006 mantidos `PROPOSED` e declarados NÃO bloqueantes — fora do escopo de fechamento do SIM-001; não bloqueiam o relatório de validação nem o início do SIM-002. Não é transição da state machine: estado do projeto permanece `RETEST_PASSED` | `coretriad/governance/APPROVALS.md` APR-2026-006 |

NOTA (coretriad-director): as transições intermediárias
`IN_DEVELOPMENT → INTERNAL_VERIFICATION → READY_FOR_AUDIT → IN_AUDIT →
FINDINGS_CONFIRMED` (fases de build/audit conduzidas pela OpusCore/VeriCore
neste ciclo) não estão registradas neste log até o momento desta entrada.
Esta linha registra exclusivamente a transição de autoridade CoreTriad
(#11 da state machine) a partir do estado `FINDINGS_CONFIRMED` — que é o
estado corrente confirmado pelos 3 findings CONFIRMED de
`audit/runs/SIM-001-AUD-001/21-findings/`. Registro histórico das
transições intermediárias, se pendente, deve ser conciliado sem alterar
esta entrada (Regra 15 do CLAUDE.md — nenhuma organização altera evidência
histórica pertencente a outra).

NOTA (coretriad-director, 2026-08-13 13:35): as 8 linhas acrescentadas após
a entrada de 10:30 registram o ciclo REMEDIATION → RETEST completo, incluindo
o `RETEST_FAILED` proposital e o loop de retorno. Todas correspondem a
transições válidas da tabela de autoridade (#12, #13, #14, #16, #17, #13,
#14, #15), com a autoridade declarada em cada linha. Nenhuma entrada
anterior foi alterada (Regra 15). A transição #18
(`RETEST_PASSED → READY_FOR_RELEASE`) NÃO foi executada — ver bloqueios
registrados em `coretriad/states/SIM-001/PROJECT_STATE.md`.

NOTA (coretriad-director, 2026-08-13 13:55): as 2 linhas de 13:50 e 13:55
NÃO são transições da state machine — são decisões humanas explícitas
(Regra 18) registradas em `coretriad/governance/APPROVALS.md` (APR-2026-005
e APR-2026-006), por isso as colunas `from`/`to` trazem `— (human gate)`.
Nenhum estado do projeto foi alterado por elas: SIM-001 permanece em
`RETEST_PASSED`. O Director apenas registra a decisão humana e sua
consequência de estado — não decide nem reclassifica finding/observação
(Regras 5 e 6). Nenhuma entrada anterior foi alterada (Regra 15).
