# Cross-Audit: Claude + Codex

## Objetivo

Para achados CRITICAL/HIGH em áreas de alto risco (segurança, autorização, integridade financeira), usar uma segunda engine
independente como segunda opinião, evitando contaminar a segunda análise com a conclusão da primeira.

```
CLAUDE AUDITOR  →  Análise A
CODEX AUDITOR   →  Análise B   (recebe apenas "audite este componente quanto a X", não a conclusão de A)
                       ↓
              FINDING VALIDATOR
                       ↓
                  EVIDÊNCIA
```

Regras:

- O segundo modelo nunca recebe a conclusão do primeiro antes de fazer sua própria análise independente.
- Divergências entre os dois nunca são resolvidas por votação — são resolvidas por evidência adicional: código, teste,
  requisito, documentação, log, ou decisão do responsável humano.
- Findings sem consenso entram como `NEEDS_MORE_EVIDENCE`, nunca são descartados silenciosamente.

## Sobre a estrutura `.codex/agents/audit/`

Este pacote inclui um placeholder em `.codex/agents/audit/README.md` com o mesmo conteúdo de missão/verificação de cada
agente (reaproveitável como prompt/instrução), mas **não gera automaticamente 69 arquivos com uma sintaxe de frontmatter
específica do Codex**, porque a configuração exata de subagentes/instruções do Codex não é algo que eu possa confirmar de
forma confiável sem acesso à documentação atual. O conteúdo de cada agente (`.claude/agents/audit/<slug>.md`) é reaproveitável
como corpo de instrução para o Codex — copie a seção a partir de `# <Cargo>` (sem o frontmatter YAML) para o formato de
configuração de agente que a versão atual do Codex exigir, e confirme isso na documentação oficial antes de depender disso
em produção.
