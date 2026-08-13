# Template de Regra de Negócio (BR)

```
BR_ID: BR-<DOMINIO>-<NUMERO>

NAME:
DESCRIPTION:
ORIGIN:                      # documento/política de origem, ex.: POL-COM-003
OWNER:
VALIDITY:                    # desde quando é válida
DOMAIN:

CONDITIONS:
EXCEPTIONS:
PRIORITY:

IMPLEMENTATION:               # arquivo/função/serviço que implementa
RELATED_USE_CASES:            # UC-...
RELATED_REQUIREMENTS:         # REQ-...
RELATED_PERMISSIONS:          # PERM-...
RELATED_TESTS:                # TC-...
```

O `business-rule-auditor` usa este template para comparar o valor/condição documentado com o valor/condição
implementado, e para identificar regra implementada sem documento de origem, ou documentada sem implementação.
