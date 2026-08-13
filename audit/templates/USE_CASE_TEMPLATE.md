# Template de Caso de Uso (UC)

```
UC_ID: UC-<DOMINIO>-<NUMERO>

NAME:
OBJECTIVE:
PRIMARY_ACTOR:
SECONDARY_ACTORS:

PRECONDITIONS:
TRIGGER:

MAIN_FLOW:
  1.
  2.
  ...

ALTERNATIVE_FLOWS:
  A1.
  A2.

EXCEPTIONS:
  E1.
  E2.

POSTCONDITIONS:

PERMISSIONS:              # PERM-...
RELATED_BUSINESS_RULES:   # BR-...
RELATED_REQUIREMENTS:     # REQ-...
RELATED_TESTS:            # TC-...
```

O `use-case-auditor` compara este documento com a implementação real (Controller → Service → Domain → Repository) e
verifica se cada fluxo alternativo e cada exceção documentada tem tratamento correspondente no código, e se
pré-condições/pós-condições são de fato garantidas — não apenas o fluxo principal ("caminho feliz").
