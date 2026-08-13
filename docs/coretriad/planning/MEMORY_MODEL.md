# MEMORY_MODEL.md — Etapa 8

**Status:** Regras de memória do CoreTriad. Formaliza o que já está em prática desde a
primeira auditoria real de hoje, mais o que falta.

## Regras obrigatórias (pedidas explicitamente no bootstrap)

1. **Auto memory não é source of truth.** A memória de sessão do Claude Code
   (`~/.claude/.../memory/MEMORY.md` e arquivos relacionados) é contexto auxiliar sobre
   COMO colaborar com o usuário — não é onde vive requisito, regra de negócio, finding
   ou aprovação. Nenhum agente deve citar essa memória como prova de um fato do sistema.
2. **Artefatos versionados são autoritativos.** `docs/project-memory/`, `audit/runs/`,
   `docs/control-plane/tasks/`, código e migrations no git — essas são as fontes reais.
   Em caso de conflito com qualquer outra coisa (memória, resumo, contexto injetado),
   o artefato versionado vence (Regra 20 do CLAUDE.md).
3. **Memória deve ser verificada.** Já provado necessário na prática: o
   `audit-scope-agent` de hoje citou um número do CLAUDE.md injetado em contexto que
   estava desatualizado em relação ao arquivo real em disco (166/202/467 vs. 169/207/478).
   Todo agente deve reler a fonte primária no momento da checagem, nunca confiar em
   contexto/memória como se fosse leitura atual.
4. **Cada empresa possui knowledge base própria.** Ver `CORETRIAD_TARGET_ARCHITECTURE.md`
   §5 — `organizations/<org>/knowledge/` é o lugar-alvo (ainda vazio) para
   conhecimento específico de cada organização que não é nem código nem achado de
   auditoria (ex.: padrões de severidade do VeriCore, golden paths do OpusCore).
5. **Hipótese não vira fato por memória.** Uma suposição registrada numa sessão anterior
   não se torna verdade só porque foi repetida — precisa ser reverificada contra a fonte
   real antes de ser usada como base de decisão.
6. **Aprovação nunca pode existir apenas na memória.** Todo gate humano precisa de
   registro explícito em artefato versionado (SCOPE.md, AUDIT_PLAN.md, o `- [x]` de uma
   tarefa em `docs/control-plane/tasks/`, ou o commit/PR aprovado) — nunca só "o usuário
   disse que sim numa conversa anterior".

## Hierarquia de fontes (da mais para a menos autoritativa)

```
1. Estado real observável agora (banco ao vivo, `git log`, arquivo em disco lido AGORA)
2. Artefato versionado (docs/project-memory, audit/runs, control-plane, ADRs)
3. Contexto de projeto injetado pelo harness (CLAUDE.md, MEMORY.md) — ADVERTÊNCIA:
   pode estar desatualizado; sempre releia a fonte antes de citar como fato
4. Memória de sessão anterior / resumo de conversa — nunca autoritativo sozinho
```

## O que falta implementar (não é regra, é lacuna)

- Não há hoje um mecanismo automático que force a releitura da fonte primária — depende
  de disciplina do agente e de correção manual pelo orquestrador quando falha (como
  aconteceu 3 vezes hoje na mesma auditoria). Candidato a virar regra de hook no futuro
  (ver `PERMISSION_MODEL.md`).
- `organizations/<org>/knowledge/` ainda não existe fisicamente — é alvo de fase
  posterior do `IMPLEMENTATION_PLAN.md`.
