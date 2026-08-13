# SYSTEM_INVENTORY.md e SYSTEM_MAP.md

## SYSTEM_INVENTORY.md — produzido no início de toda auditoria

```
AUDIT_ID:
REPOSITORY:
BRANCH:
COMMIT_HASH:
VERSION:
DATE:
ENVIRONMENT:
AUDITORS:

LANGUAGES:
FRAMEWORKS:
APPARENT_ARCHITECTURE:        # ex.: MVC, DDD, hexagonal, monolito, microsserviços
MODULES:
CONTROLLERS:
SERVICES:
REPOSITORIES:
ENTITIES_MODELS:
MIGRATIONS:
DATABASE:
APIS:
MIDDLEWARES:
TESTS:
CICD:
INFRASTRUCTURE:
DOCUMENTATION_FOUND:
DEPENDENCIES:
INTEGRATIONS:
AUTHENTICATION_MECHANISM:
AUTHORIZATION_MECHANISM:
OBSERVABILITY_STACK:
```

## SYSTEM_MAP.md — mapa de módulos e riscos

| Módulo | Responsabilidade | Dependências | Banco | Endpoints | Regras de negócio | Testes | Owner | Risco |
|---|---|---|---|---|---|---|---|---|
| ... | ... | ... | ... | ... | ... | ... | ... | Alto/Médio/Baixo |

O `SYSTEM_MAP.md` orienta o `audit-planning-agent` a alocar profundidade de auditoria proporcional ao risco de cada
módulo — módulos de risco "Alto" recebem trilhas completas; módulos de risco "Baixo" podem receber auditoria por
amostragem, desde que isso fique registrado explicitamente (não silenciosamente).
