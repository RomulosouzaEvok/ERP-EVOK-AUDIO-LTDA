# Padrões de identificação (IDs)

Nunca depender apenas de nomes textuais. Todo artefato relevante recebe um ID único e estável.

| Prefixo | Significado | Formato | Exemplo |
|---|---|---|---|
| `AUD` | Audit (a auditoria em si) | `AUD-<AAAA-MM>-<SISTEMA>` | `AUD-2026-08-ERP` |
| `PROC` | Processo de negócio | `PROC-<DOMINIO>-<NUMERO>` | `PROC-COM-001` |
| `BR` | Business Rule (regra de negócio) | `BR-<DOMINIO>-<NUMERO>` | `BR-FIN-001` |
| `REQ` | Requisito (funcional) | `REQ-<DOMINIO>-<NUMERO>` | `REQ-FIN-021` |
| `NFR` | Non-Functional Requirement | `NFR-<CATEGORIA>-<NUMERO>` | `NFR-PERF-001` |
| `UC` | Use Case (caso de uso) | `UC-<DOMINIO>-<NUMERO>` | `UC-PCP-001` |
| `AC` | Acceptance Criteria | `AC-<DOMINIO>-<NUMERO>` | `AC-FIN-004` |
| `TC` | Test Case | `TC-<DOMINIO>-<NUMERO>` | `TC-PCP-034` |
| `ADR` | Architecture Decision Record | `ADR-<NUMERO>` | `ADR-021` |
| `API` | Contrato de API | `API-<RECURSO>-<NUMERO>` | `API-ORDERS-001` |
| `SEC` | Requisito de segurança | `SEC-<DOMINIO>-<NUMERO>` | `SEC-AUTHZ-003` |
| `PERM` | Permissão | `PERM-<RECURSO>-<ACAO>` | `PERM-SALE-DISCOUNT` |
| `FIND` / `AUD-<DOMINIO>` | Finding (achado de auditoria) | `AUD-<DOMINIO>-<NUMERO>` | `AUD-MVC-0042` |

Domínios/categorias de exemplo (ajustar ao vocabulário do sistema real): `FIN`, `COM`, `PCP`, `EST`, `SEC`, `AUTHZ`,
`MVC`, `DB`, `API`, `INTEG`, `QA`, `DEVOPS`, `PERF`, `DOC`, `TRACE`, `TENANT`, `DATA`, `LLM`.

Categorias de `NFR`: `PERF`, `SEC`, `AVAIL`, `SCALE`, `RELI`, `OBS`, `PRIV`, `RECOV`, `MAINT`, `COMPAT`, `ACCESS`, `AUDIT`.
