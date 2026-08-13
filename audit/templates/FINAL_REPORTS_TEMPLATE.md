# Relatórios finais da auditoria

Produzidos pelo `audit-reporting-agent`, a partir dos findings validados e consolidados. **Nunca enviados diretamente
a stakeholders por um agente** — a entrega é sempre um ato humano.

## EXECUTIVE_AUDIT_REPORT.md (para direção)

```
1. Contexto e escopo da auditoria
2. Metodologia (resumo, sem jargão técnico)
3. Nível geral de risco (visão executiva)
4. Findings CRITICAL e HIGH (resumo de negócio, sem detalhe técnico de exploração)
5. Principais riscos de negócio e operacionais identificados
6. Dívida documental identificada
7. Nível de maturidade observado (produto/requisitos/arquitetura/segurança/qualidade/operação)
8. Recomendações priorizadas
9. Próximos passos sugeridos (remediação, reteste, nova auditoria)
```

## TECHNICAL_AUDIT_REPORT.md (para engenharia)

```
1. Metodologia detalhada e escopo técnico
2. Arquitetura observada
3. Requisitos, regras de negócio e casos de uso — cobertura e lacunas
4. Matriz de rastreabilidade (resumo + link para TRACEABILITY_MATRIX.md completa)
5. Segurança (achados por subdomínio: autenticação, autorização, dados, dependências, configuração)
6. Código, MVC e arquitetura — violações identificadas
7. Banco de dados
8. APIs (matriz de cobertura)
9. Integrações
10. Qualidade e testes
11. DevOps, CI/CD, infraestrutura, SRE/observabilidade
12. Documentação
13. Lista completa de findings (com evidência, severidade, confiança, recomendação)
14. Reteste necessário e critério de fechamento por finding
```

## REMEDIATION_BACKLOG.md

| Finding | Prioridade | Owner sugerido | Dependência | Correção esperada | Evidência de reteste necessária |
|---|---|---|---|---|---|
| AUD-MVC-0042 | Alta | Backend + Tech Lead | Nenhuma | Mover cálculo para PricingService/Domain Policy | Teste unitário da regra + reteste do finding |

Regra: **o Remediation Backlog é gerado ao final da fase AUDIT — a correção em si nunca ocorre durante a auditoria.**
