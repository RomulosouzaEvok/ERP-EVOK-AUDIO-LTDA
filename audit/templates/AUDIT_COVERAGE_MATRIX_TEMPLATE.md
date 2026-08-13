# AUDIT_COVERAGE_MATRIX — Matriz de Cobertura da Auditoria

Mantida pelo `software-audit-director`. Não declarar a auditoria "completa" sem esta matriz demonstrando cobertura real.

| Área | Inventariada | Auditada | Findings | Validada |
|---|---|---|---|---|
| Requisitos | 100% | 100% | 14 | ✓ |
| Casos de uso | 100% | 95% | 7 | ✓ |
| Regras de negócio | 100% | 100% | 9 | ✓ |
| Arquitetura / MVC | 100% | 100% | 21 | ✓ |
| APIs | 100% | 100% | 9 | ✓ |
| Banco de dados | 100% | 100% | 12 | ✓ |
| Segurança / Autorização | 100% | 100% | 6 | ✓ |
| Integrações | 100% | 80% | 3 | pendente |
| Qualidade / Testes | 100% | 100% | 11 | ✓ |
| Plataforma / Operação | 100% | 90% | 5 | pendente |
| Documentação | 100% | 100% | 18 | ✓ |
| IA (se aplicável) | N/A | N/A | N/A | N/A |

"Auditada" ≠ 100% de código lido linha a linha — significa que a trilha foi executada com profundidade proporcional ao
risco definida no `AUDIT_PLAN.md`. Qualquer célula abaixo de 100% deve ter justificativa registrada (ex.: fora de
escopo, dependência externa não disponível para teste).
