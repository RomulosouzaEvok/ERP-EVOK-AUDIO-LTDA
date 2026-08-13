# PROJECT STATE — SIM-001

| Campo | Valor |
|---|---|
| Project ID | SIM-001 |
| Nome | Sala Livre — API de reserva de salas de reunião |
| Tipo | SIMULATION |
| Data de registro | 2026-08-13 |
| Estado atual | `RETEST_PASSED` |
| Situação do ciclo | FECHADO como ciclo de validação — **NÃO ARQUIVADO** |
| Última atualização | 2026-08-13 13:55 |
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

### Bloqueios anteriores — RESOLVIDOS por decisão humana (2026-08-13)

Os dois itens que este Control Plane havia registrado como bloqueios do
encerramento do SIM-001 foram resolvidos por decisão humana explícita
(Regra 18) e **não bloqueiam mais** nem o fechamento do ciclo nem o início
do SIM-002:

1. **OBS-SIM-001-A (`userRole` autodeclarado) — human gate FECHADO.**
   `RISK_ACCEPTED` decidido por Gilwagno em `APR-2026-005`, com escopo
   **restrito ao simulado SIM-001** (ambiente fictício, sem dados reais e
   sem exposição). A aprovação não se estende a nenhum outro projeto. Para
   projetos reais a mesma condição é finding **CRITICAL bloqueante de
   release** — norma permanente registrada na **Regra 24 do `CLAUDE.md`** e
   em `docs/coretriad/CORETRIAD_MASTER_SPEC.md` Parte IV §20.
   Evidência: `coretriad/governance/APPROVALS.md` APR-2026-005 +
   `audit/runs/SIM-001-AUD-001/31-new-findings/NEW_OBSERVATIONS.md`.
2. **FIND-SIM-001-004, -005 e -006 — deixam de ser impeditivos.**
   Permanecem em status `PROPOSED`, declarados **fora do escopo de
   fechamento do SIM-001** e **não bloqueantes** por decisão de Gilwagno em
   `APR-2026-006`: não bloqueiam o `SIM-001_VALIDATION_REPORT.md` nem o
   início do SIM-002. O Director não reclassifica findings — apenas
   registra a decisão humana (Regras 5 e 6).

### Situação de encerramento: FECHADO como ciclo de validação, NÃO ARQUIVADO

- **FECHADO como ciclo de validação.** O ciclo completo IDEA → BUILD →
  AUDIT → FINDINGS → REMEDIATION → RETEST (incluindo o `RETEST_FAILED`
  proposital e o loop de retorno) foi executado ponta a ponta, o relatório
  de validação foi emitido e todos os findings CRITICAL/HIGH do escopo
  estão `CLOSED` pela VeriCore.
- **NÃO ARQUIVADO.** O arquivamento definitivo do SIM-001 depende da ação
  pendente do `APR-2026-006`: rodar o `vericore-finding-validator` sobre
  FIND-SIM-001-004, -005 e -006 — ou descartá-los junto com o ambiente do
  SIM-001, caso se conclua que não têm valor de aprendizado para o
  processo. Enquanto essa ação não ocorrer, o projeto permanece fechado
  como ciclo, porém não arquivado.

### Estado da state machine (sem alteração)

- **Estado atual permanece `RETEST_PASSED`.** As duas decisões humanas de
  13:50 e 13:55 são human gates registrados, **não** transições da tabela
  de autoridade — estão no event log com `— (human gate)` nas colunas
  `from`/`to`.
- **O run de auditoria segue sem `AUDIT_PASSED`.** O
  `vericore-software-audit-director` não declarou `AUDIT_PASSED` para
  SIM-001-AUD-001 (FIND-SIM-001-004, -005 e -006 seguem `PROPOSED` e a
  `AUDIT_COVERAGE_MATRIX` do run não foi emitida). `RETEST_PASSED` cobre
  apenas os 3 findings remediados e não substitui o encerramento do run.
  Somente a VeriCore pode declarar `AUDIT_PASSED` (Regras 2 e 4).
- **SIM-001 não vai para `READY_FOR_RELEASE`.** A transição #18 NÃO foi e
  não será executada: SIM-001 é projeto de validação do modelo operacional
  CoreTriad e **não haverá release real**. As transições #19 (`RELEASED`),
  #20 (`MONITORING`) e #21 (`CLOSED`) **não se aplicam** a este projeto e
  não devem ser executadas.
