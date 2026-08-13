---
name: coretriad-sim-close
description: Fecha o ciclo completo do CoreTriad em um projeto simulado (default SIM-001) - findings formais, validação, remediação com falha proposital, reteste independente, prova de autoridade de fechamento e relatório final.
---

# CORETRIAD SIMULATION CYCLE CLOSE

Projeto alvo: o simulado indicado pelo usuário (default: SIM-001).

## FASE 1 — FORMALIZAÇÃO DOS FINDINGS

Para cada defeito detectado na auditoria do simulado, criar finding com
`coretriad/templates/FINDING_TEMPLATE.md` (IDs FIND-<SIM>-001..N),
incluindo AUDIT_COMMIT, evidência, arquivo/linhas, rastreabilidade
(BR/REQ/UC/AC/TC) e RETEST_SPECIFICATION.

## FASE 2 — VALIDAÇÃO

`finding-validator` tenta REFUTAR cada finding (middleware, policy, guard,
interceptor, camadas compensatórias). Resultado por finding:
CONFIRMED / FALSE_POSITIVE / DUPLICATE / NEEDS_MORE_EVIDENCE.
Somente CONFIRMED prossegue.

## FASE 3 — HANDOFF

Para cada CONFIRMED: gerar REMEDIATION_CASE
(`coretriad/contracts/REMEDIATION_CASE.md`). Transição
FINDINGS_CONFIRMED → READY_FOR_REMEDIATION registrada no event log.

## FASE 4 — REMEDIAÇÃO (SanaCore)

Por caso: worktree `sana/<SIM>/<FINDING>`; fluxo REPRODUCE → ROOT CAUSE →
BLAST RADIUS → DESIGN → IMPLEMENT → REGRESSION; registrar ROOT_CAUSE,
LOCAL_FIX, SYSTEMIC_FIX_REQUIRED, BLAST_RADIUS, FILES_AFFECTED,
REGRESSION_RISK. **Deixar propositalmente UMA correção incompleta** (para
provar o loop de falha). Cada caso gera REMEDIATION_EVIDENCE_PACKAGE com
REMEDIATION_COMMIT (o AUDIT_COMMIT original permanece referenciado).

## FASE 5 — RETESTE INDEPENDENTE (VeriCore)

Por finding: reproduzir o bug ORIGINAL (não confiar nos testes da
SanaCore) + executar retest specification + regressão proporcional +
verificar side effects, requisito e documentação.
Esperado: N-1 RETEST_PASSED e 1 RETEST_FAILED.

## FASE 6 — LOOP DE FALHA

RETEST_FAILED → nova evidência → SanaCore v2 → novo reteste → PASS.

## FASE 7 — PROVA DE AUTORIDADE

1. SanaCore TENTA declarar finding CLOSED → esperado BLOCKED.
2. VeriCore, após RETEST_PASSED, declara CLOSED → esperado ALLOWED.

## FASE 8 — RELATÓRIO

Gerar `<SIM>_VALIDATION_REPORT.md` cobrindo: build, audit, detecção,
validação, remediação, evidence packages, reteste, loop de falha,
autoridade de fechamento, imutabilidade do AUDIT_COMMIT, isolamento por
worktree, enforcement de hooks, state machine (histórico completo de
transições com actor/organization) e rastreabilidade fim-a-fim de cada
finding. Veredito por item: PASS/FAIL. PARAR para revisão humana.
