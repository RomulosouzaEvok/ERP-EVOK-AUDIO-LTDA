# IMPLEMENTATION_PLAN.md — Etapa 12

**Status:** Plano de implantação em fases, com critério de aceite objetivo por fase.
Nenhuma fase abaixo foi executada a partir deste documento — a execução começa só
depois do gate humano final desta etapa (`/coretriad-bootstrap`, seção FINAL).

## Fase 0 — já concluída antes deste bootstrap (registro, não ação nova)

- Constituição (`CORETRIAD_MASTER_SPEC.md`), CLAUDE.md curto, SSOT do ERP migrado,
  91 agentes reais existentes e descobertos pelo Claude Code, primeira auditoria real
  rodada (`AUD-2026-08-ERP-EVOK-FULL`) com achados reais corrigidos.
- **Critério de aceite (retroativo, já satisfeito):** `docs-reality-drift-guard` e
  `docs-path-reference-guard` verdes; 91 agentes respondem quando invocados.

## Fase 1 — Estrutura organizacional e Control Plane (sem migrar/excluir agentes)

**Objetivo:** materializar as pastas `organizations/<org>/{skills,governance,workflows,
standards,templates,knowledge}/` vazias (ou com README placeholder), sem tocar em
`.claude/agents/`.

**Critério de aceite:**
- As 3×6 subpastas existem, cada uma com um `README.md` de 1 parágrafo dizendo o que vai
  morar ali.
- `git status` mostra só arquivos novos (nenhum arquivo de agente movido/renomeado).
- Nenhum teste do ERP quebra (`npm run test:unit`, `docs-*-guard`).

## Fase 2 — Materializar OpusCore / VeriCore / SanaCore formalmente

**Objetivo:** dar às 3 organizações seus artefatos de governança/skills/workflows/
standards/templates/knowledge reais (não placeholder), consultando
`AGENT_ALLOCATION_MATRIX.md` para não criar agente duplicado.

**Critério de aceite:**
- Cada organização tem pelo menos 1 documento real em `governance/` (ex.: cópia
  referenciada das regras já existentes no Master Spec, adaptada ao nível de detalhe da
  organização).
- Nenhum novo agente `.md` foi criado nesta fase (isso é Fase 3).

## Fase 3 — Materializar agentes como subagentes do Claude Code (o que falta: SanaCore)

**Objetivo:** criar os agentes de SanaCore que hoje não existem (ver `GAP_ANALYSIS.md`
§1) — no mínimo Triagem, Correção, Evidência (ver
`CORETRIAD_TARGET_ARCHITECTURE.md` §2). Cada um com identidade, empresa, departamento,
missão, responsabilidades, competências, entradas/saídas, ferramentas, permissões,
autoridade, proibições, escalonamento, handoff e Definition of Done — mesmo padrão já
usado pelos 91 agentes existentes.

**Critério de aceite:**
- Novos agentes aparecem na lista "Available agent types" do Claude Code (testável como
  fizemos hoje com `product-manager` e `appsec-auditor` — invocar com uma tarefa trivial
  e confirmar resposta).
- Nenhum nome de agente de SanaCore colide com nome existente em OpusCore/VeriCore
  (checagem mecânica, mesma que já fizemos ao importar os 69 do VeriCore).
- `AGENT_ALLOCATION_MATRIX.md` atualizado para refletir os novos agentes.

## Fase 4 — Guardrails reais (Camada 3 do `PERMISSION_MODEL.md`)

**Objetivo:** implementar hooks que reforcem isolamento por caminho E por organização —
"modo conservador" primeiro (bloquear só os casos mais óbvios, expandir depois).

**Critério de aceite:**
- Hook de `PreToolUse` existe em `.claude/settings.local.json`.
- Testes A/B/C/D do plano de implantação do usuário (passo 17) rodam e o resultado real
  bate com o esperado (`BLOCKED` para B e C, que hoje NÃO estão bloqueados — ver
  `GAP_ANALYSIS.md` §5).
- Nenhum agente de OpusCore perde a capacidade de escrever código legítimo (regressão
  do incidente de hoje não se repete — testar explicitamente antes de considerar a fase
  concluída).

## Fase 5 — Handoffs formais

**Objetivo:** os 9 contratos de `HANDOFF_CONTRACTS.md` passam a ser gerados como
arquivos reais em `docs/control-plane/tasks/`, não descritos em prosa.

**Critério de aceite:**
- Pelo menos 1 handoff de cada tipo foi gerado e consumido de ponta a ponta no dry-run
  do SIM-001 (Fase 7).

## Fase 6 — State machine e worktrees

**Objetivo:** o `STATE_MACHINE.md` e o `WORKTREE_MODEL.md` deixam de ser desenho e
passam a ser seguidos de fato (mesmo que manualmente, sem automação de transição).
Decisão pendente sobre a branch `remediation/production-readiness` resolvida aqui.

**Critério de aceite:**
- Um item de trabalho percorre pelo menos os estados `IDEA_RECEIVED` até
  `READY_FOR_AUDIT` com registro em `docs/control-plane/tasks/` a cada transição.
- Worktrees `opus/<PROJECT>/<TASK>` e `sana/<PROJECT>/<FINDING>` testados com nomes
  reais (mesmo que no SIM-001, não no ERP ainda).

## Fase 7 — Testes de segregação (passos 17-19 do plano do usuário)

**Objetivo:** rodar os 4 testes de bloqueio (A/B/C/D) e os 2 testes de worktree/
AUDIT_COMMIT imutável, DEPOIS da Fase 4 estar pronta — rodá-los antes só serve para
confirmar a lacuna (o que já fizemos ao registrar em `GAP_ANALYSIS.md`).

**Critério de aceite:** os 6 testes passam com o resultado esperado.

## Fase 8 — SIM-001 (dry-run completo antes do ERP real)

**Objetivo:** ciclo completo OpusCore→VeriCore→SanaCore→VeriCore num produto fictício
pequeno ("Sistema de cadastro e aprovação de fornecedores"), incluindo os erros
intencionais do passo 22 do plano do usuário (regra sem requisito, requisito sem teste,
permissão só no frontend, valores divergentes entre regra e código).

**Critério de aceite:**
- VeriCore encontra os 4 erros intencionais sem dica.
- SanaCore corrige com Root Cause → Blast Radius → Correção → Evidência (não troca linha
  só porque VeriCore apontou aquela linha).
- VeriCore reteste reproduz o problema original antes de confirmar, não confia só na
  suíte fornecida por SanaCore.

## Fase 9 — Operar o ERP real via CoreTriad

**Objetivo:** só depois da Fase 8 passar integralmente. Registrar o ERP existente via
`/coretriad-onboard` (a criar) em vez de tratá-lo como produto novo.

**Critério de aceite:** primeira tarefa real do ERP conduzida ponta a ponta pelo
CoreTriad, com todos os artefatos (Fases 1-8) realmente usados, não simulados.

---

## Ordem e dependência entre fases

```
Fase 0 (feito) → Fase 1 → Fase 2 → Fase 3 → Fase 4 → Fase 5 → Fase 6 → Fase 7 → Fase 8 → Fase 9
```

Nenhuma fase pula a anterior. Se uma fase falhar seu critério de aceite, a próxima não
começa — mesmo princípio de "não force o fluxo completo se algo não está pronto" que já
rege o resto do CoreTriad.
