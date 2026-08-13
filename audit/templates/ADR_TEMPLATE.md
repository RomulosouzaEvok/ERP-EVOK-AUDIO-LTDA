# Template de ADR (Architecture Decision Record)

```
ADR_ID: ADR-<NUMERO>

CONTEXT:
PROBLEM:
ALTERNATIVES_CONSIDERED:
DECISION:
CONSEQUENCES:
RISKS:
COST:
REVERSIBILITY:
MIGRATION_NOTES:
```

O `architecture-documentation-auditor` verifica se decisões arquiteturais relevantes (ex.: usar fila em vez de chamada
síncrona) têm ADR correspondente, e se as consequências previstas (ex.: "precisa de idempotência") foram de fato
endereçadas na implementação.
