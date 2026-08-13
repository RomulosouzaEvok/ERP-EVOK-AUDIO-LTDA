# CORETRIAD_TARGET_ARCHITECTURE.md — Etapa 3

**Status:** Arquitetura-alvo proposta a partir do inventário real (`CURRENT_AGENT_INVENTORY.md`)
e da Constituição (`docs/coretriad/CORETRIAD_MASTER_SPEC.md`). Nenhum agente foi movido,
renomeado ou criado a partir deste documento — é desenho, não execução.

---

## 1. Organograma

```
                              ┌─────────────┐
                              │  CoreTriad   │  (orquestração — sessão principal
                              │ Control Plane│   + docs/project-memory + docs/control-plane)
                              └──────┬──────┘
                 ┌───────────────────┼───────────────────┐
                 ▼                   ▼                   ▼
          ┌─────────────┐    ┌─────────────┐     ┌─────────────┐
          │  OpusCore    │    │  VeriCore    │     │  SanaCore    │
          │  (constrói)  │    │  (audita)    │     │  (remedia)   │
          │  22 agentes  │    │  69 agentes  │     │  0 agentes*  │
          └─────────────┘    └─────────────┘     └─────────────┘
```
`*` SanaCore ainda não tem agentes próprios — ver `GAP_ANALYSIS.md` §1. Até existirem,
agentes de OpusCore assumem o papel (`CORETRIAD_MASTER_SPEC.md` §8.4).

## 2. Departamentos por organização

### OpusCore (8 departamentos, 22 agentes)

| Departamento | Agentes |
|---|---|
| Produto | product-manager, business-analyst, ux-researcher, product-designer |
| Arquitetura | software-architect, security-architect |
| Engenharia | tech-lead, backend-engineer, frontend-engineer, data-engineer, ai-llm-engineer |
| Qualidade | code-reviewer, qa-engineer, sdet-test-automation |
| Segurança | appsec-engineer |
| Plataforma | platform-engineer, devops-engineer |
| Operação | sre-engineer |
| Transversais | documentation-agent, release-agent, dependency-agent, finops-agent |

### VeriCore (9 trilhas + governança, 69 agentes)

Ver `AGENT_ASSIGNMENT.md` de `audit/runs/AUD-2026-08-ERP-EVOK-FULL/02-plan/` para a
distribuição já exercitada numa auditoria real: Produto/Negócio, Documentação,
Arquitetura, Engenharia, Dados/Banco, Segurança, Qualidade/Testes, Plataforma/Operação,
Integrações, IA (condicional, hoje não alocada), Governança (director, scope, planning,
finding-validator, evidence-controller, consolidator, reporting-agent).

### SanaCore (departamentos-alvo, ainda não materializados)

| Departamento proposto | Responsabilidade | Status |
|---|---|---|
| Triagem | Confirmar reprodução do finding a partir do Remediation Backlog | Não existe — OpusCore assume |
| Correção | Implementar o fix no escopo mínimo, em worktree isolado | Não existe — OpusCore assume |
| Evidência | Compilar o Remediation Evidence Package para o reteste | Não existe — OpusCore assume |

## 3. Hierarquia e autoridade (resumo — detalhe em `AUTHORITY_MATRIX.md`)

- **Dentro de OpusCore:** Product Manager e Tech Lead não têm autoridade hierárquica um
  sobre o outro — cada um veta na sua função (produto vs. execução técnica). Nenhum
  agente de OpusCore aprova release em produção sozinho (gate humano sempre).
- **Dentro de VeriCore:** `software-audit-director` coordena mas não audita pessoalmente;
  `finding-validator` tem autoridade para refutar qualquer finding CRITICAL/HIGH, mesmo
  de um auditor mais "sênior" na trilha.
- **Entre organizações:** nenhuma tem autoridade hierárquica sobre outra. VeriCore não
  manda OpusCore corrigir nada diretamente — o handoff é sempre via Remediation Backlog
  aprovado por humano (`CORETRIAD_MASTER_SPEC.md` §8.1).

## 4. Comunicação e handoffs (resumo — detalhe em `HANDOFF_CONTRACTS.md`)

```
OpusCore --[SOFTWARE_RELEASE_PACKAGE]--> VeriCore
VeriCore --[FINDING → ... → REMEDIATION_CASE]--> SanaCore (via Backlog aprovado)
SanaCore --[REMEDIATION_EVIDENCE_PACKAGE]--> VeriCore
VeriCore --[RETEST_REPORT]--> Humano (RISK_ACCEPTED ou CLOSED)
```

## 5. O que este documento NÃO decide

- Não decide se as pastas `organizations/opuscore/agents/` etc. vão conter cópias ou só
  governança/knowledge (ver `GAP_ANALYSIS.md` e decisão pendente já levantada com o
  usuário na sessão de hoje: `.claude/agents/` continua sendo a ÚNICA fonte que o Claude
  Code descobre — `organizations/` deve conter governança/skills/workflows/standards/
  templates/knowledge, não uma segunda cópia dos `.md` de agente).
- Não cria nenhum agente de SanaCore — isso é decisão de fase posterior do
  `IMPLEMENTATION_PLAN.md`.
