# BOOTSTRAP_REVALIDATION — 2026-08-13

**Contexto:** re-execução de `/coretriad-bootstrap` na máquina
`C:\Gilwagno WorkSpace\ERP-Evok--Audio-LTDA` (branch `main`, HEAD `c9359be`).
Os 12 documentos de planejamento das Etapas 1–12 **já existem e estão
versionados** (commit `c9359be`, 2026-08-13). Este adendo não substitui nenhum
deles — registra as divergências encontradas entre o que os documentos
descrevem e o estado real DESTA máquina, para decisão humana.

Nada foi movido, renomeado, excluído ou sobrescrito nesta re-execução.

---

## F1 — `.claude/` inteiro está no `.gitignore` (CRÍTICO)

`.gitignore:13` ignora `.claude/`. Consequências verificadas
(`git ls-files .claude/` → vazio):

- Os **91 agentes CoreTriad** descritos em `CURRENT_AGENT_INVENTORY.md`
  (pastas `.claude/agents/Centro Autônomo de Engenharia de Software[ auditoria]/`)
  **não existem nesta máquina** — só existem no outro PC
  (`C:/Sistema EvokAudio/ERP-Evok--Audio-LTDA`, caminho registrado no próprio
  inventário). Nesta máquina, `.claude/agents/` contém o **roster ANTIGO
  pré-CoreTriad (16 agentes planos**: programador, auditor, AdmDBA, etc.) —
  exatamente o roster que o inventário declara substituído.
- Hooks, `settings.json` e as skills `coretriad-*` também não são versionados.
  O usuário alterna entre dois PCs: **o runtime CoreTriad inteiro não viaja
  com o repositório.**

Isso viola as Regras 7 (artefatos versionados = única fonte de verdade) e 23
(permissões impostas por hooks e settings) do `CLAUDE.md`: o mecanismo de
enforcement é, hoje, um artefato local não versionado.

**Decisão humana necessária:** deixar de ignorar (whitelist) ao menos
`.claude/agents/`, `.claude/hooks/`, `.claude/skills/` e `.claude/settings.json`
(mantendo `settings.local.json` ignorado), OU definir outro mecanismo oficial
de sincronização. Recomendação: whitelist no `.gitignore`.

## F2 — Control plane `coretriad/` está untracked (ALTO)

Só `coretriad/README.md` está versionado. `contracts/` (10 templates),
`governance/AUTHORITY_MATRIX.md`, `states/STATE_MACHINE.md`, `templates/` (3)
e `locks/.gitkeep` existem nesta máquina (criados 2026-08-13 10:35) mas
**nunca foram commitados**. Se este working tree se perder, a fonte oficial de
verdade do control plane se perde junto.

**Ação recomendada:** commit + push imediato (após revisão do conteúdo).

## F3 — Hook `org-isolation.js` VALIDADO neste ambiente (Etapa 9)

- Node disponível: v24.18.0. Hook registrado em `.claude/settings.json`
  (PreToolUse, matcher `Write|Edit|MultiEdit|NotebookEdit`). Sem jq ou
  binários externos.
- Testes executados nesta máquina (payload real via stdin):
  - VeriCore → Write `src/app.ts` → **block** ✔
  - OpusCore → Write `audit/runs/x.md` → **block** ✔
  - `audit-evidence-controller` → Write `audit/runs/x.md` → **approve** ✔
  - Tool de leitura → **approve** (não interfere) ✔
  - Payload ilegível → **block** (fail-closed) ✔
- **Ressalva material:** o hook identifica a organização por
  `agent_type`/`subagent_type` no payload e **aprova quando não há agente
  identificável** ("sessão principal"). Se o payload real do Claude Code não
  carregar a identidade do subagente, o enforcement é silenciosamente nulo.
  Prova definitiva exige `/coretriad-test-segregation`
  (TEST-HOOK-001..004, com verificação de filesystem) — ainda não executado
  nesta máquina.

## F4 — Especificação e CLAUDE.md com mudanças não commitadas

`docs/coretriad/CORETRIAD_MASTER_SPEC.md` tem **991 linhas alteradas**
não commitadas e `CLAUDE.md` tem 144. Os documentos de planejamento
referenciam seções (ex.: "§8.4", "seção 14 — Emendas") que não existem na
versão em disco — indício de que citam a versão anterior do spec. Regra 21:
determinar a fonte autoritativa antes de decidir. **Decisão humana:** revisar
e commitar (ou descartar) essas mudanças para eliminar a ambiguidade.

## F5 — Estado das aprovações pendentes do bootstrap

- `AGENT_ALLOCATION_MATRIX.md`: **sem registro de aprovação humana explícita.**
  A materialização (`/coretriad-materialize`, prefixos `coretriad-`/`opuscore-`/
  `vericore-`/`sanacore-`) permanece bloqueada até essa aprovação.
- Nenhum dos 91 agentes usa os prefixos obrigatórios — a matriz aprovanda deve
  contemplar o renomeio na materialização.
- SanaCore continua com **0 agentes** (gap CRÍTICO já registrado no
  `GAP_ANALYSIS.md` §1) — segregação remediação↔implementação ainda depende
  de disciplina, não de estrutura.
- Testes de segregação (Fase 6), SIM-001 (Fase 5) e SIM-002: não executados.

---

## Ordem recomendada de próximos passos (aguarda aprovação humana)

1. Resolver F1 (whitelist `.claude/` no `.gitignore`) e sincronizar os 91
   agentes do outro PC para o repositório versionado.
2. Commitar F2 (control plane) e resolver F4 (spec/CLAUDE.md pendentes) —
   commit sempre com push (regra permanente do projeto).
3. Aprovar formalmente a `AGENT_ALLOCATION_MATRIX.md` → `/coretriad-materialize`.
4. `/coretriad-test-segregation` (prova real do hook, F3).
5. SIM-001 → testes Fases 6–9 → SIM-002 → `CORETRIAD OPERATIONALLY VALIDATED`.
