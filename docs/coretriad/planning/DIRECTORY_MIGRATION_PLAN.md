# DIRECTORY_MIGRATION_PLAN.md — Etapa 11

**Status:** Só mostra o antes/depois. **Nenhum arquivo foi movido a partir deste
documento** — regra explícita desta etapa do bootstrap.

## Estrutura atual (raiz do repositório, 2026-08-13)

```
ERP-Evok--Audio-LTDA/
├── CLAUDE.md                                    # curto, 20 regras CoreTriad
├── docs/
│   ├── coretriad/
│   │   ├── CORETRIAD_MASTER_SPEC.md             # Constituição
│   │   └── planning/                            # os 12 documentos desta etapa
│   ├── project-memory/
│   │   └── product/ERP_SSOT.md                  # SSOT do ERP (migrado do CLAUDE.md)
│   ├── control-plane/tasks/
│   └── ... (docs departamentais pré-existentes do ERP)
├── .claude/
│   ├── agents/
│   │   ├── Centro Autônomo de Engenharia de Software/            # 22 = OpusCore
│   │   └── Centro Autônomo de Engenharia de Software auditoria/  # 69 = VeriCore
│   ├── commands/            # 11 (.md): 6 dev + 5 audit-*
│   └── skills/
│       ├── coretriad-bootstrap/
│       └── evok-production-readiness/
├── .codex/agents/*.toml     # 21 arquivos — roster ANTIGO, pré-CoreTriad
├── audit/                   # VeriCore: framework, standards, templates, runs
├── organizations/           # vazia (placeholder)
├── coretriad/               # vazia (placeholder, raiz — não confundir com docs/coretriad/)
├── remediation/             # vazia (placeholder — SanaCore)
└── server/, client/, mobile/, tv/  # o produto real (ERP)
```

## Estrutura-alvo CoreTriad (proposta, não aplicada)

```
ERP-Evok--Audio-LTDA/
├── CLAUDE.md                                    # inalterado
├── docs/
│   ├── coretriad/ (inalterado)
│   ├── project-memory/ (inalterado)
│   └── control-plane/ (inalterado)
├── .claude/
│   ├── agents/               # PERMANECE como ÚNICA fonte que o Claude Code descobre —
│   │   ├── opuscore/          # renomeado de "Centro Autônomo..." (cosmético, opcional)
│   │   ├── vericore/          # renomeado de "Centro Autônomo... auditoria" (cosmético, opcional)
│   │   └── sanacore/          # NOVO — agentes de SanaCore quando forem criados
│   ├── commands/ (+ /coretriad-idea, /coretriad-onboard, /veri-retest quando existirem)
│   └── skills/ (+ coretriad-idea, coretriad-onboard quando existirem)
├── .codex/agents/*.toml       # ATUALIZAR ou marcar aposentado com nota explícita
├── audit/ (inalterado)
├── organizations/
│   ├── opuscore/{skills,governance,workflows,standards,templates,knowledge}/
│   ├── vericore/{skills,governance,workflows,standards,templates,knowledge}/
│   └── sanacore/{skills,governance,workflows,standards,templates,knowledge}/
│       (NENHUM contém .md de agente — isso mora só em .claude/agents/)
├── remediation/               # passa a ter conteúdo real quando SanaCore existir
└── server/, client/, mobile/, tv/ (inalterado)
```

## Diffs específicos (o que muda, item por item)

| Item | Ação proposta | Risco se feito sem cuidado |
|---|---|---|
| Renomear `Centro Autônomo de Engenharia de Software` → `opuscore` | Cosmético, opcional — só renomear a pasta, sem tocar no conteúdo dos 22 `.md` | Baixo, mas precisa reconfirmar (como fizemos hoje com `product-manager`/`appsec-auditor`) que o Claude Code ainda descobre os agentes depois do rename |
| Renomear `Centro Autônomo de Engenharia de Software auditoria` → `vericore` | Mesmo que acima, para os 69 | Mesmo risco, mesma mitigação |
| Popular `organizations/<org>/` | Criar as 6 subpastas por organização (skills, governance, workflows, standards, templates, knowledge), SEM copiar `.md` de agente para lá | **Risco real se ignorado:** copiar os agentes para cá criaria uma segunda fonte divergente — é o gap já identificado em `GAP_ANALYSIS.md` §1 |
| Atualizar `.codex/agents/*.toml` | Adicionar nota de "substituído pelo CoreTriad" (mínimo) ou regenerar os 91 equivalentes (máximo) | Se ignorado, usuário do Codex CLI opera com roster fantasma |
| `remediation/` | Só ganha conteúdo quando SanaCore tiver agentes reais | Nenhum — já é vazio hoje, sem regressão possível |
| Branch `remediation/production-readiness` | Decisão pendente (ver `WORKTREE_MODEL.md`) — arquivar, renomear, ou aceitar como exceção histórica | Precisa de decisão humana antes, não é mecânica |

## O que este plano recomenda NÃO fazer nesta fase

- Não renomear as pastas de agentes ainda (mesmo sendo "cosmético") — fazer isso e a
  reorganização de `organizations/` no mesmo commit dificulta reverter se algo quebrar.
  Separar em fases (ver `IMPLEMENTATION_PLAN.md`).
- Não tocar em `.codex/agents/*.toml` sem decisão explícita do usuário sobre qual dos
  dois caminhos (nota vs. regeneração completa) ele quer.
