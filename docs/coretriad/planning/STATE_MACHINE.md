# STATE_MACHINE.md — Etapa 6

**Status:** Modelo proposto para o ciclo de vida de um item de trabalho (ideia →
release), complementar ao ciclo de vida de um Finding já definido em
`CORETRIAD_MASTER_SPEC.md` §13. Nenhum estado abaixo está automatizado ainda —
implementação real é fase posterior (via `docs/control-plane/tasks/`).

## Estados e quem pode executar cada transição

| # | Estado | Entra vindo de | Quem executa a transição | Sai para |
|---|---|---|---|---|
| 1 | `IDEA_RECEIVED` | (início) | Humano registra a ideia (via `/coretriad-idea`, quando existir) | `DISCOVERY` |
| 2 | `DISCOVERY` | `IDEA_RECEIVED` | `product-manager` + `ux-researcher` (OpusCore) | `REQUIREMENTS` |
| 3 | `REQUIREMENTS` | `DISCOVERY` | `business-analyst` (OpusCore), com `product-manager` | `ARCHITECTURE` |
| 4 | `ARCHITECTURE` | `REQUIREMENTS` | `software-architect` + `security-architect` (OpusCore) | `READY_FOR_BUILD` |
| 5 | `READY_FOR_BUILD` | `ARCHITECTURE` | **GATE HUMANO** — aprovação de PRD+arquitetura (`CORETRIAD_MASTER_SPEC.md` §2.2) | `IN_DEVELOPMENT` |
| 6 | `IN_DEVELOPMENT` | `READY_FOR_BUILD` | `tech-lead` distribui para `backend-engineer`/`frontend-engineer`/`data-engineer`/`ai-llm-engineer`; `code-reviewer` + `qa-engineer` fecham o PR | `READY_FOR_AUDIT` |
| 7 | `READY_FOR_AUDIT` | `IN_DEVELOPMENT` | OpusCore entrega `SOFTWARE_RELEASE_PACKAGE` (ver `HANDOFF_CONTRACTS.md`); **AUDIT_COMMIT é fixado aqui** (Regra 11/12 do CLAUDE.md) | `IN_AUDIT` |
| 8 | `IN_AUDIT` | `READY_FOR_AUDIT` | `software-audit-director` (VeriCore) distribui fieldwork | `FINDINGS_CONFIRMED` |
| 9 | `FINDINGS_CONFIRMED` | `IN_AUDIT` | `finding-validator` confirma/refuta; `audit-consolidator` deduplica; `audit-reporting-agent` produz Backlog | `IN_REMEDIATION` (se houver Backlog não vazio) ou `READY_FOR_RELEASE` (se zero findings confirmados) |
| 10 | `IN_REMEDIATION` | `FINDINGS_CONFIRMED` | **GATE HUMANO** aprova o Backlog; SanaCore (ou OpusCore no papel, §8.4) corrige em worktree isolado | `READY_FOR_RETEST` |
| 11 | `READY_FOR_RETEST` | `IN_REMEDIATION` | Handoff via `docs/control-plane/tasks/` (`REMEDIATION_EVIDENCE_PACKAGE`) | `IN_RETEST` |
| 12 | `IN_RETEST` | `READY_FOR_RETEST` | VeriCore — agente DIFERENTE de quem fez o finding original e de quem remediou (Regra de segregação) | `RETEST_PASSED` ou volta para `IN_REMEDIATION` (reteste reprovado) |
| 13 | `RETEST_PASSED` | `IN_RETEST` | Só VeriCore declara (Regra 4 do CLAUDE.md) | `READY_FOR_RELEASE` |
| 14 | `READY_FOR_RELEASE` | `RETEST_PASSED` ou `FINDINGS_CONFIRMED` (zero findings) | `release-agent` compila `RELEASE_ASSURANCE_PACKAGE` | `RELEASED` |
| 15 | `RELEASED` | `READY_FOR_RELEASE` | **GATE HUMANO FINAL** — deploy em produção (nunca automático) | (fim do ciclo; item entra em operação, monitorado por `sre-engineer`) |

## Regras de transição que não são estado, mas afetam o diagrama

- **Delta audit (Regra 13 do CLAUDE.md):** se o código mudar depois que `AUDIT_COMMIT`
  foi fixado (passo 7), o item NÃO pode avançar de `IN_AUDIT`/`FINDINGS_CONFIRMED` direto
  — precisa voltar para `READY_FOR_AUDIT` com um novo `AUDIT_COMMIT`, ou abrir uma auditoria
  delta explicitamente escopada só para o diff.
- **Nenhuma transição pula um gate humano.** Os gates (passo 5, dentro do passo 10,
  passo 15, e o `RISK_ACCEPTED` alternativo ao passo 13) são pontos de parada reais, não
  documentação de intenção.
- **`RISK_ACCEPTED` é uma saída lateral do estado 12**, não um estado numerado nesta
  lista principal — quando o humano aceita o risco em vez de exigir correção, o item
  salta de `IN_RETEST`/`FINDINGS_CONFIRMED` direto para `READY_FOR_RELEASE`, com o aceite
  registrado (nunca atribuído por agente).

## Diagrama

```
IDEA_RECEIVED
   → DISCOVERY
      → REQUIREMENTS
         → ARCHITECTURE
            → READY_FOR_BUILD ─────────────────[GATE HUMANO]
               → IN_DEVELOPMENT
                  → READY_FOR_AUDIT  ← AUDIT_COMMIT fixado aqui
                     → IN_AUDIT
                        → FINDINGS_CONFIRMED
                           ├─(backlog vazio)──────────────────┐
                           └─(backlog não vazio)               │
                              → IN_REMEDIATION ──[GATE HUMANO]  │
                                 → READY_FOR_RETEST             │
                                    → IN_RETEST                 │
                                       ├─(reprovado)→ IN_REMEDIATION (volta)
                                       └─(aprovado)→ RETEST_PASSED
                                                        │       │
                                                        ▼       ▼
                                                   READY_FOR_RELEASE
                                                        │
                                                        ▼
                                                    RELEASED ──[GATE HUMANO FINAL]
```
