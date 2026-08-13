---
name: coretriad-materialize
description: Materializa a estrutura de agentes do CoreTriad em .claude/agents/ conforme a AGENT_ALLOCATION_MATRIX aprovada. Exige aprovação humana prévia da matriz.
---

# CORETRIAD MATERIALIZE

## PRÉ-CONDIÇÕES (verificar antes de qualquer ação)

1. `docs/coretriad/planning/AGENT_ALLOCATION_MATRIX.md` existe.
2. O usuário confirmou aprovação da matriz NESTA sessão. Se não confirmou,
   perguntar explicitamente: "A AGENT_ALLOCATION_MATRIX.md está aprovada?"
   e aguardar resposta afirmativa. Sem aprovação → ABORTAR.
3. `CURRENT_AGENT_INVENTORY.md` existe (discovery concluído).

## PROCEDIMENTO

1. Ler a matriz de alocação e o inventário.
2. Para cada agente com decisão KEEP: não alterar.
3. Para cada MODIFY: ajustar preservando capacidades existentes.
4. Para cada MERGE: consolidar sem perder conteúdo.
5. Para cada DEPRECATE: mover para `.claude/agents/_deprecated/`
   (nunca apagar).
6. Criar somente os agentes FALTANTES listados no GAP_ANALYSIS.

## REGRAS OBRIGATÓRIAS

- Prefixos: `coretriad-`, `opuscore-`, `vericore-`, `sanacore-`.
  Nunca nomes ambíguos (`backend`, `security`).
- Nenhum agente sem empresa definida.
- Ficha de cada agente: missão, responsabilidades, PODE, NÃO PODE,
  entradas, saídas, ferramentas mínimas, critério de conclusão,
  relação hierárquica.
- Auditores VeriCore: ferramentas read-only (Read, Grep, Glob).
  Escrita de evidência exclusivamente via
  `vericore-audit-evidence-controller` em `audit/`.
- Proibido alterar `src/`, `product/` ou qualquer código do sistema.

## SAÍDA

Listar todos os agentes por empresa com a decisão aplicada
(KEEP/MODIFY/MERGE/DEPRECATE/CREATED) e PARAR para conferência humana.
