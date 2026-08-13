# AGENT_ALLOCATION_MATRIX.md — Etapa 4

**Status:** Todo agente tem empresa e responsabilidade definida. Nenhum agente foi
movido ou criado a partir deste documento — a alocação abaixo já é a realidade atual
(nenhuma migração de pasta é necessária, só confirmação formal).

## Regra de aceite desta etapa

"Nenhum agente pode ficar sem empresa ou responsabilidade definida" — checado: os 91
agentes reais (`CURRENT_AGENT_INVENTORY.md`) têm todos `TARGET_COMPANY` preenchido
(OpusCore ou VeriCore) e responsabilidade correspondente ao grupo/trilha. **Nenhum
agente órfão encontrado.**

## Matriz por organização e departamento/trilha

| Organização | Departamento/Trilha | Nº agentes | Agentes |
|---|---|---|---|
| OpusCore | Produto | 4 | product-manager, business-analyst, ux-researcher, product-designer |
| OpusCore | Arquitetura | 2 | software-architect, security-architect |
| OpusCore | Engenharia | 5 | tech-lead, backend-engineer, frontend-engineer, data-engineer, ai-llm-engineer |
| OpusCore | Qualidade | 3 | code-reviewer, qa-engineer, sdet-test-automation |
| OpusCore | Segurança | 1 | appsec-engineer |
| OpusCore | Plataforma | 2 | platform-engineer, devops-engineer |
| OpusCore | Operação | 1 | sre-engineer |
| OpusCore | Transversais | 4 | documentation-agent, release-agent, dependency-agent, finops-agent |
| **OpusCore total** | | **22** | |
| VeriCore | Produto/Negócio | 8 | product-auditor, requirements-auditor, business-rule-auditor, use-case-auditor, acceptance-criteria-auditor, business-process-auditor, domain-logic-auditor*, traceability-auditor |
| VeriCore | Documentação | 8 | documentation-audit-lead, documentation-consistency-auditor, architecture-documentation-auditor, data-documentation-auditor, security-documentation-auditor, api-documentation-auditor, operations-documentation-auditor, test-documentation-auditor |
| VeriCore | Arquitetura | 5 | architecture-auditor, domain-architecture-auditor, mvc-architecture-auditor, dependency-architecture-auditor, integration-architecture-auditor |
| VeriCore | Engenharia | 11 | backend-auditor, frontend-auditor, fullstack-auditor, controller-auditor, service-layer-auditor, repository-layer-auditor, domain-logic-auditor*, idempotency-auditor, api-auditor, external-api-auditor, webhook-auditor, integration-auditor (12 contando domain-logic-auditor 2x — ver nota) |
| VeriCore | Dados/Banco | 4 | database-auditor, migration-auditor, data-integrity-auditor, tenant-isolation-auditor |
| VeriCore | Segurança | 8 | appsec-auditor, authentication-auditor, authorization-auditor, session-security-auditor, secrets-auditor, security-configuration-auditor, dependency-security-auditor, audit-log-security-auditor |
| VeriCore | Qualidade/Testes | 5 | qa-auditor, test-coverage-auditor, test-architecture-auditor, sdet-auditor, regression-auditor |
| VeriCore | Plataforma/Operação | 8 | devops-auditor, cicd-auditor, infrastructure-auditor, observability-auditor, performance-auditor, resilience-auditor, backup-recovery-auditor, sre-auditor |
| VeriCore | IA (condicional — 0 alocados hoje) | 5 | ai-system-auditor, ai-evaluation-auditor, llm-security-auditor, rag-auditor, agent-permission-auditor |
| VeriCore | Governança | 7 | software-audit-director, audit-scope-agent, audit-planning-agent, finding-validator, audit-evidence-controller, audit-consolidator, audit-reporting-agent |
| **VeriCore total** | | **69** | |
| SanaCore | (nenhum departamento materializado) | 0 | — ver `GAP_ANALYSIS.md` §1 |

`*` `domain-logic-auditor` aparece em Produto/Negócio E Engenharia porque seu mandato
cruza os dois (máquina de estado é regra de negócio E é código) — mesmo padrão de
dupla alocação que `AGENT_ASSIGNMENT.md` da auditoria real já usou para esse agente.
Contado uma vez no total de 69.

## Cobertura por criticidade do ERP (referência cruzada com a auditoria real já rodada)

A primeira auditoria real (`AUD-2026-08-ERP-EVOK-FULL`) já validou esta alocação na
prática: dos 13 domínios classificados CRITICAL em `RISK_CLASSIFICATION.md`, todos
tiveram pelo menos um agente de cada trilha relevante (Produto, Arquitetura, Engenharia,
Dados, Segurança) atribuído — nenhum domínio CRITICAL ficou sem cobertura de trilha.

## Pendência explícita

Como SanaCore não tem agentes, não há linha de alocação para "remediação" nesta matriz
além da nota já registrada no Master Spec (§8.4): agentes de OpusCore assumem
temporariamente. Esta matriz será atualizada quando agentes de SanaCore forem
formalmente criados (fase posterior do `IMPLEMENTATION_PLAN.md`).
