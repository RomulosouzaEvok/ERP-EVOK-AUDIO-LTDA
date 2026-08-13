---
name: coretriad-bootstrap
description: Analisa o repositório e prepara a implantação da organização multiempresa CoreTriad (OpusCore, VeriCore, SanaCore, Control Plane) sem modificar a estrutura existente antes da aprovação arquitetural humana.
---

# CORETRIAD BOOTSTRAP

Leia integralmente antes de qualquer ação:

- `docs/coretriad/CORETRIAD_MASTER_SPEC.md`
- `CLAUDE.md`

## OBJETIVO

Transformar este repositório em um ambiente CoreTriad composto por
OpusCore, VeriCore, SanaCore e CoreTriad Control Plane.

**NÃO comece reorganizando arquivos. Primeiro faça discovery.**

Este repositório pode já conter uma implementação parcial (agentes, skills,
hooks, worktrees, projetos simulados como SIM-001). Nada do que existe pode
ser perdido ou sobrescrito sem passar pelo inventário e pela aprovação
humana.

Todos os artefatos de planejamento vão em `docs/coretriad/planning/`.

## ETAPA 1 — INVENTÁRIO

Localize: `CLAUDE.md`, `.claude/` (agents, skills, commands, hooks,
settings), pastas antigas de agents/prompts, documentação, integrações MCP,
configuração Codex (`.codex/`), workflows, scripts, worktrees e branches
existentes, projetos simulados, runs de auditoria.

Produza `CURRENT_AGENT_INVENTORY.md`. Para cada agente: nome atual,
caminho, missão, capacidades, ferramentas, permissões, dependências,
empresa-alvo (OPUSCORE / VERICORE / SANACORE / CORETRIAD), decisão
(KEEP / MODIFY / MERGE / DEPRECATE), lacunas.

## ETAPA 2 — TARGET ARCHITECTURE

Produza `CORETRIAD_TARGET_ARCHITECTURE.md`: Control Plane, as três
empresas, organograma, departamentos, agentes, hierarquia, autoridade.

## ETAPA 3 — ALOCAÇÃO

Produza `AGENT_ALLOCATION_MATRIX.md`. Nenhum agente pode ficar sem
organização.

## ETAPA 4 — AUTORIDADE

Produza `AUTHORITY_MATRIX.md` (partindo de
`coretriad/governance/AUTHORITY_MATRIX.md`): quem lê, escreve, recomenda,
aprova, bloqueia e fecha estado.

## ETAPA 5 — STATE MACHINE

Produza `STATE_MACHINE.md` (partindo de
`coretriad/states/STATE_MACHINE.md`) com todas as transições e autoridades.

## ETAPA 6 — HANDOFFS

Produza `HANDOFF_CONTRACTS.md` formalizando os 10 contratos, referenciando
os templates de `coretriad/contracts/`.

## ETAPA 7 — MEMORY ARCHITECTURE

Produza `MEMORY_MODEL.md`. Regras: auto memory não é source of truth; pode
ser compartilhada entre worktrees do mesmo repositório (worktree não isola
memória); artefatos versionados são autoritativos; cada empresa possui
knowledge base versionada própria; hipótese nunca vira fato por memória.

## ETAPA 8 — WORKTREE ARCHITECTURE

Produza `WORKTREE_MODEL.md`: `opus/<PROJECT>/<TASK>`,
`sana/<PROJECT>/<FINDING>`, VeriCore sempre em AUDIT_COMMIT congelado
(nunca segue HEAD silenciosamente), component lock, write ownership,
conflict detection, integration branch, delta audit.

## ETAPA 9 — PERMISSIONS

Produza `PERMISSION_MODEL.md` usando: agent tool restrictions, Claude
permissions (allow/ask/deny), hooks (`.claude/hooks/org-isolation.js`) e
directory ownership. Nunca depender exclusivamente do prompt para
segurança. Valide que o hook está registrado em `.claude/settings.json` e
que funciona neste ambiente (Node disponível; não usar jq ou binários
externos).

## ETAPA 10 — GAP ANALYSIS

Produza `GAP_ANALYSIS.md`: agentes faltantes, duplicados,
responsabilidades sobrepostas, problemas de segregação, ausências de
documentação, contracts, hooks e state control.

## ETAPA 11 — MIGRATION PLAN

Produza `DIRECTORY_MIGRATION_PLAN.md` (estrutura atual → desejada).
Não mova arquivos ainda.

## ETAPA 12 — IMPLEMENTATION PLAN

Produza `IMPLEMENTATION_PLAN.md` em fases com critérios de aceite,
seguindo as Fases 1–10 da Parte VII do master spec (incluindo SIM-001,
testes de segregação com verificação de filesystem, concorrência,
rastreabilidade, false positive e SIM-002).

## IMPORTANTE — PARE AQUI

Depois de gerar esses documentos: **PARE.**

Não faça ainda: movimentação massiva, exclusão de agente, renomeação
definitiva, alteração de código de produto, implementação integral.

Apresente a arquitetura encontrada e a proposta para revisão humana.
A materialização dos agentes em `.claude/agents/` (prefixos obrigatórios
`coretriad-`, `opuscore-`, `vericore-`, `sanacore-`) só ocorre após a
aprovação explícita da `AGENT_ALLOCATION_MATRIX.md` pelo usuário.
