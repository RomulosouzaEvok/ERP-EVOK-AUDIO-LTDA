# Template de Finding

Nunca aceitar um finding sem arquivo, linha, evidência e impacto. "Pode haver um problema de segurança" não é um finding —
é uma hipótese. Copie o bloco abaixo para cada achado.

```
FINDING_ID: AUD-<DOMINIO>-<NUMERO>

TITLE:
DOMAIN:
SUBDOMAIN:

SEVERITY:        # CRITICAL | HIGH | MEDIUM | LOW | INFO
CONFIDENCE:      # CONFIRMED | HIGH_CONFIDENCE | MEDIUM_CONFIDENCE | LOW_CONFIDENCE
STATUS:          # OPEN | VALIDATING | CONFIRMED | REMEDIATION_PLANNED | REMEDIATED | RETEST_REQUIRED | CLOSED | RISK_ACCEPTED | FALSE_POSITIVE | DUPLICATE

DESCRIPTION:

EXPECTED_BEHAVIOR:

ACTUAL_BEHAVIOR:

EVIDENCE:
FILE:
LINES:

RELATED_REQUIREMENT:        # REQ-...
RELATED_BUSINESS_RULE:      # BR-...
RELATED_USE_CASE:           # UC-...
RELATED_TEST:               # TC-...

BUSINESS_IMPACT:
TECHNICAL_IMPACT:
SECURITY_IMPACT:

REPRODUCTION:

REFERENCE:                  # ex.: OWASP ASVS V4.x, NIST SSDF PW.x

RECOMMENDATION:

SUGGESTED_OWNER:

RETEST_REQUIRED:            # Yes | No
```

## Regras de preenchimento

- `FILE`/`LINES` são obrigatórios sempre que o finding se referir a código.
- `SEVERITY` e `CONFIDENCE` nunca são o mesmo campo — preencha os dois, separadamente.
- `RECOMMENDATION` deve ser uma ação concreta (ex.: "mover regra para PricingService e criar teste unitário"), não um
  conselho genérico ("melhorar a segurança").
- Findings sem `EVIDENCE` verificável não avançam para `CONFIRMED` — ficam em `VALIDATING` até haver evidência.
