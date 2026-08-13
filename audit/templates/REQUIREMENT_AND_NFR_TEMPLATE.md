# Templates de Requisito (REQ) e Requisito Não Funcional (NFR)

## Requisito funcional

```
REQ_ID: REQ-<DOMINIO>-<NUMERO>

DESCRIPTION:
TYPE:                # funcional | não funcional | regulatório | segurança | integração | dados | operacional
ORIGIN:               # solicitante/owner/processo/regra relacionada
QUALITY_CHECK:        # claro? não ambíguo? verificável? testável? consistente? necessário? completo?

RELATED_PROCESS:       # PROC-...
RELATED_BUSINESS_RULE: # BR-...
RELATED_USE_CASE:      # UC-...
RELATED_ACCEPTANCE_CRITERIA: # AC-...
IMPLEMENTATION:
RELATED_TEST:          # TC-...
```

## Requisito não funcional (NFR)

```
NFR_ID: NFR-<CATEGORIA>-<NUMERO>
# Categorias: PERF, SEC, AVAIL, SCALE, RELI, OBS, PRIV, RECOV, MAINT, COMPAT, ACCESS, AUDIT

DESCRIPTION:          # ex.: "Consulta de pedidos deve responder P95 < 1s para 100 usuários concorrentes"
TARGET_METRIC:
EVIDENCE_OF_VALIDATION:   # como/quando foi efetivamente testado — não aceitar NFR sem evidência real
STATUS:               # VALIDATED | NOT_VALIDATED | PARTIALLY_VALIDATED
```

O `requirements-auditor` deve marcar como finding todo comportamento relevante sem `REQ_ID` de origem ("requisito
fantasma"), e todo NFR sem `EVIDENCE_OF_VALIDATION` real (não basta o NFR estar escrito — precisa ter sido testado).
