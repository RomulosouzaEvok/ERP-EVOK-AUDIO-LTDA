# Severidade, Confiança e Status de um Finding

Severidade e confiança são **dimensões independentes**. `CRITICAL + LOW_CONFIDENCE` é um finding diferente de
`CRITICAL + CONFIRMED` — ambos merecem atenção, mas com tratamento e urgência diferentes.

## Severidade

| Severidade | Significado |
|---|---|
| `CRITICAL` | Comprometimento grave, fraude, vazamento relevante de dados, perda ou corrupção de dados críticos, acesso cross-tenant. |
| `HIGH` | Exploração viável ou falha funcional importante com impacto real de negócio/segurança. |
| `MEDIUM` | Risco real, mas com impacto limitado ou condições de exploração restritas. |
| `LOW` | Fragilidade de baixa exposição ou baixo impacto. |
| `INFO` | Melhoria, observação arquitetural ou de manutenção — não é risco em si. |

## Confiança

| Confiança | Significado |
|---|---|
| `CONFIRMED` | Reproduzido/comprovado com evidência direta (código, teste, log, execução). |
| `HIGH_CONFIDENCE` | Evidência forte, mas não totalmente reproduzida em ambiente real. |
| `MEDIUM_CONFIDENCE` | Indício plausível, evidência parcial. |
| `LOW_CONFIDENCE` | Hipótese razoável, mas evidência insuficiente — não descartar, marcar para investigação adicional. |

## Status de um finding (ciclo de vida)

```
OPEN → VALIDATING → CONFIRMED → REMEDIATION_PLANNED → REMEDIATED → RETEST_REQUIRED → CLOSED
                  ↘ FALSE_POSITIVE
                  ↘ DUPLICATE
CONFIRMED → RISK_ACCEPTED   (somente por responsável humano autorizado, nunca por um agente)
```

Regra dura: **findings CRITICAL e HIGH devem preferencialmente passar pelo `finding-validator` antes de `CONFIRMED`.**
`RISK_ACCEPTED` nunca é um status que um agente pode atribuir — é sempre uma decisão humana registrada.
