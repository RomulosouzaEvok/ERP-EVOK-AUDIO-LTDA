# Project Memory — Fonte de verdade compartilhada entre agentes

Sem uma fonte de verdade comum, cada agente forma seu próprio entendimento do projeto e
a coerência se perde (Agent A entende X, Agent B entende Y). Esta pasta é essa fonte.

**Regra de ouro:** todo artefato aqui deve ter owner, data/versão implícita no commit, e
critério de atualização claro. Não crie documentação duplicada — atualize o arquivo
existente ou, se um artefato mudou de "verdade", registre isso como uma nova decisão em
vez de editar silenciosamente o histórico.

## Estrutura

```
project-memory/
├── product/         PRD, Product Vision, Business Case, KPIs, roadmap
├── architecture/
│   └── adrs/         Architecture Decision Records — um arquivo por decisão relevante
├── decisions/        Decisões não-arquiteturais com impacto duradouro (ex.: processo,
│                     política de release, exceções aprovadas)
├── security/         Threat models, security requirements, exception register
├── operations/       Runbooks, SLOs, postmortems, release notes
└── quality/          Test strategy, risk matrix, evidência de qualidade por release
```

## Convenções

- **ADRs** (`architecture/adrs/`): use o formato `NNNN-titulo-curto.md` (ex.:
  `0007-escolha-de-fila-de-eventos.md`). Todo ADR tem status (`proposto` /
  `aceito` / `substituído por ADR-XXXX`) e nunca é apagado — decisões revertidas ganham
  um novo ADR que referencia o anterior.
- **PRDs** (`product/`): mantenha só a versão vigente no arquivo principal; histórico de
  mudanças relevantes vai no changelog do próprio arquivo ou no histórico do git.
- **Security exception register** (`security/`): toda exceção de segurança aceita por um
  humano deve ficar registrada aqui com data, aprovador e prazo de reavaliação.

## Quem escreve aqui

Cada subagente em `.claude/agents/` sabe (pela própria ficha técnica) em qual subpasta
deve escrever suas saídas. A sessão principal (orquestrador) é responsável por garantir
que o artefato certo vá para a pasta certa quando o subagente não fizer isso diretamente.
