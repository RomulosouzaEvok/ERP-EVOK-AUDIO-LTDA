# PROJECT EVENT LOG — SIM-002 (PagaFácil)

State machine: `coretriad/states/STATE_MACHINE.md`
AUDIT_COMMIT: `f2fcf1c78a6a1255738d05e66a6100fa9c47428a` (imutável)

| timestamp | from | to | actor | organization | reason | artifact/evidence |
|---|---|---|---|---|---|---|
| 2026-08-13 14:00 | — | IDEA_RECEIVED | coretriad-director | CORETRIAD | Registro do simulado avançado de validação SIM-002 (PagaFácil) — cadastro e aprovação de fornecedores com pagamento | `coretriad/states/SIM-002/PROJECT_STATE.md` |
| 2026-08-13 14:05 | IDEA_RECEIVED | DISCOVERY | coretriad-director | CORETRIAD | Transição #1 — simulado avançado de validação; discovery faz parte do pacote OpusCore a ser construído | `coretriad/states/SIM-002/PROJECT_STATE.md` |
| 2026-08-13 14:10 | DISCOVERY | REQUIREMENTS | coretriad-director | CORETRIAD | Simulado avançado de validação — requisitos produzidos pela OpusCore no pacote de build | `coretriad/states/SIM-002/PROJECT_STATE.md` |
| 2026-08-13 14:15 | REQUIREMENTS | ARCHITECTURE | coretriad-director | CORETRIAD | Simulado avançado de validação — arquitetura faz parte do pacote OpusCore a ser construído | `coretriad/states/SIM-002/PROJECT_STATE.md` |
| 2026-08-13 14:20 | ARCHITECTURE | READY_FOR_BUILD | coretriad-director | CORETRIAD | Simulado avançado de validação — pacote liberado para build OpusCore no exercício | `coretriad/states/SIM-002/PROJECT_STATE.md` |
| 2026-08-13 14:25 | READY_FOR_BUILD | IN_DEVELOPMENT | coretriad-director | CORETRIAD | Transição #5 — OpusCore acionada para construir o pacote PagaFácil | `coretriad/states/SIM-002/PROJECT_STATE.md` |
| 2026-08-13 15:10 | IN_DEVELOPMENT | INTERNAL_VERIFICATION | opuscore-backend-engineer | OPUSCORE | Transição #6 — build concluído, verificação interna OpusCore sobre o pacote PagaFácil | SOFTWARE_RELEASE_PACKAGE SIM-002-RC1 |
| 2026-08-13 15:20 | INTERNAL_VERIFICATION | READY_FOR_AUDIT | opuscore-backend-engineer | OPUSCORE | Transição #7 — SOFTWARE_RELEASE_PACKAGE SIM-002-RC1 entregue, suíte 12/12 verde; OpusCore não aprova a própria auditoria (Regra 1) | SOFTWARE_RELEASE_PACKAGE SIM-002-RC1, suíte 12/12 |
| 2026-08-13 15:30 | READY_FOR_AUDIT | IN_AUDIT | vericore | VERICORE | Transição #8 — 8 trilhas paralelas de auditoria sobre o AUDIT_COMMIT congelado `f2fcf1c`, sem acesso ao gabarito do simulado (Regras 12 e 13) | `audit/runs/SIM-002-AUD-001/00-scope/SCOPE.md` |
| 2026-08-13 16:30 | IN_AUDIT | FINDINGS_CONFIRMED | vericore-finding-validator | VERICORE | Transição #10 — 13 findings emitidos, 9 validados adversarialmente, 0 falsos positivos, 2 severidades rebaixadas | `audit/runs/SIM-002-AUD-001/21-findings/` |
| 2026-08-13 16:40 | FINDINGS_CONFIRMED | READY_FOR_REMEDIATION | coretriad-director | CORETRIAD | Transição #11 — findings CONFIRMED encaminhados à SanaCore para remediação (Regras 2 e 3) | `audit/runs/SIM-002-AUD-001/21-findings/` |
| 2026-08-13 16:50 | READY_FOR_REMEDIATION | IN_REMEDIATION | sanacore-remediation-engineer | SANACORE | Transição #12 — ondas de remediação WAVE-A, WAVE-B e WAVE-C assumidas em worktrees isolados a partir do AUDIT_COMMIT `f2fcf1c` | Branches `sana/SIM-002/*` a partir de `f2fcf1c` |
| 2026-08-13 17:40 | IN_REMEDIATION | READY_FOR_RETEST | sanacore-remediation-evidence | SANACORE | Transição #13 — REMEDIATION_EVIDENCE_PACKAGEs das WAVEs A/B/C entregues; SanaCore não fecha o próprio finding (Regra 3) | REMEDIATION_COMMITs `f0aaa7a` (WAVE-A), `9f7b056` (WAVE-B), `9ce4754` (WAVE-C) |
| 2026-08-13 17:50 | READY_FOR_RETEST | IN_RETEST | vericore-software-audit-director | VERICORE | Transição #14 — reteste independente das WAVEs A/B/C pela VeriCore | `audit/runs/SIM-002-AUD-001/30-retest/` |
| 2026-08-13 18:20 | IN_RETEST | RETEST_PASSED (parcial) | vericore-software-audit-director | VERICORE | Transição #15 — 7 findings CLOSED (001, 002, 003, 005, 006, 007, 011); **`AUDIT_PASSED` RECUSADO** com FIND-SIM-002-004 (CRITICAL) ainda aberto | `audit/runs/SIM-002-AUD-001/30-retest/RETEST_REPORT.md` |
| 2026-08-13 18:35 | — (human gate) | — (human gate) | Gilwagno (humano) | HUMAN | APR-2026-007 — semântica de `cancelPayment` definida: válido só em `created`, sem cancelamento após `sent`. Destrava FIND-SIM-002-004 | `coretriad/governance/APPROVALS.md` (APR-2026-007) |
| 2026-08-13 18:40 | — (human gate) | — (human gate) | Gilwagno (humano) | HUMAN | APR-2026-008 — matriz de papéis de pagamento definida (escrita `manager`, leitura `analyst`+`manager`) com papel verificado no servidor. Destrava FIND-SIM-002-008-A e OBS-002 | `coretriad/governance/APPROVALS.md` (APR-2026-008) |
| 2026-08-13 18:45 | — (human gate) | — (human gate) | Gilwagno (humano) | HUMAN | APR-2026-009 — estado `failed` criado no domínio de `payments.status` para recusa do gateway. Destrava FIND-SIM-002-009 | `coretriad/governance/APPROVALS.md` (APR-2026-009) |
| 2026-08-13 18:50 | RETEST_PASSED | IN_REMEDIATION | coretriad-director + sanacore | CORETRIAD | Transição #17 (autoridade CoreTriad + SanaCore) — reabertura do ciclo para a WAVE-D remediar os findings destravados pelos human gates 007/008/009 (FIND-004, FIND-008-A, FIND-009) | `coretriad/governance/APPROVALS.md` + `audit/runs/SIM-002-AUD-001/30-retest/RETEST_REPORT.md` |

NOTA (coretriad-director, 2026-08-13 18:45): as 3 linhas de 18:35, 18:40 e
18:45 **não são transições da state machine** — são decisões humanas explícitas
(Regra 18) registradas em `coretriad/governance/APPROVALS.md`, por isso as
colunas `from`/`to` trazem `— (human gate)`. Elas não alteram estado por si:
resolvem a lacuna normativa que impedia a SanaCore de remediar sem inventar
regra de negócio (Regra 6). O Director apenas registra a decisão humana e sua
consequência — não decide nem reclassifica finding (Regras 5 e 6).

NOTA (coretriad-director, 2026-08-13 18:50) — divergência a conciliar: a
`STATE_MACHINE.md` vigente descreve a transição **#17 como
`RETEST_FAILED → IN_REMEDIATION`**, com autoridade CoreTriad + SanaCore. A
reabertura registrada às 18:50 parte de um `RETEST_PASSED` **parcial** (7
findings fechados, `AUDIT_PASSED` recusado, FIND-004 CRITICAL aberto) e usa
essa mesma autoridade. O evento está registrado como ocorreu, sem alteração de
entrada anterior (Regra 15). A conciliação do texto da state machine — se cabe
uma transição explícita `RETEST_PASSED → IN_REMEDIATION` ou se o reteste
parcial deveria ter sido classificado `RETEST_FAILED` — é decisão da VeriCore
e do responsável humano, não do Director (Regras 4, 5 e 21).

NOTA (coretriad-director): `AUDIT_PASSED` (transição #9) NÃO foi declarado
para o run SIM-002-AUD-001 e somente a VeriCore pode declará-lo (Regras 2 e 4).
As transições #18 (`READY_FOR_RELEASE`), #19 (`RELEASED`), #20 (`MONITORING`) e
#21 (`CLOSED`) não se aplicam a este projeto: SIM-002 é simulado de validação
do modelo operacional CoreTriad e não haverá release real.
