# Readiness de Go-Live - ERP EVOK AUDIO

**Data:** 2026-07-31  
**Ambiente avaliado:** Windows + Docker Desktop + PostgreSQL local isolado  
**Decisao atual:** nao liberar producao ate concluir build CI definitivo, rollback real e aceite humano

## Resumo

O backend esta tecnicamente consistente nas validacoes locais, com migrations
aplicadas no PostgreSQL do projeto, suites estritas sem skips, secret scan limpo
e auditoria de dependencias sem vulnerabilidades conhecidas de producao.

O smoke operacional da API foi validado com uma imagem local-runtime de
contingencia, gerada sem executar `npm ci` dentro do Docker. O go-live ainda
permanece bloqueado ate o build CI/Dockerfile principal ser comprovado, porque
o Docker Desktop segue instavel para Node/npm em HTTPS.

## Evidencias aprovadas

| Area | Evidencia | Resultado |
|---|---|---|
| Banco Docker | `docker compose up -d postgres` | PASS |
| Banco Docker | `evok-postgres` healthcheck | `healthy` |
| Migrations | `npm --prefix .\server run migration:up` | PASS |
| Migrations | `npm --prefix .\server run migration:status` | 9 migrations `up` |
| TypeScript | `npm --prefix .\server run typecheck` | PASS |
| Build local | `npm --prefix .\server run build` | PASS |
| Unitarios estritos | `npm --prefix .\server run test:unit:strict` | 16 suites, 87 testes PASS |
| API/integracao estrita | `npm --prefix .\server run test:api:strict` | 5 integracao + 1 edge PASS |
| Secret scan | `npm --prefix .\server run scan:secrets` | PASS |
| Dependencias prod | `npm --prefix .\server audit --omit=dev` | 0 vulnerabilidades |
| Smoke Docker contingencial | `scripts/build-g5-local-runtime-image.ps1` | imagem criada |
| Smoke Docker contingencial | `/health/live` e `/health/ready` | 200 |
| Smoke Docker contingencial | usuario do container | `uid=999(evok)` |

## Migrations aplicadas

| Migration | Objetivo |
|---|---|
| `20260731-000001-baseline-schema.cjs` | Baseline versionada do schema |
| `20260731-000002-add-expand-contract-item-columns.cjs` | Compatibilidade de colunas `item_id` |
| `20260731-000003-align-nullable-legacy-columns.cjs` | Alinhar nullable legado em departamentos/fornecedores |
| `20260731-000004-align-supplier-optional-columns.cjs` | Alinhar opcionais de fornecedores |
| `20260731-000005-align-product-optional-columns.cjs` | Alinhar opcionais de produtos |
| `20260731-000006-align-bom-optional-columns.cjs` | Alinhar opcionais de BOM |
| `20260731-000007-align-purchase-optional-columns.cjs` | Alinhar opcionais de pedidos de compra |
| `20260731-000008-align-account-payable-optional-columns.cjs` | Alinhar opcionais de contas a pagar |
| `20260731-000009-align-audit-log-optional-columns.cjs` | Alinhar opcionais de auditoria |

## Bloqueios de go-live

| Bloqueio | Gate | Impacto | Condicao de desbloqueio |
|---|---|---|---|
| Build Dockerfile/CI principal nao concluido | G5 | Sem artefato final reproduzivel pelo pipeline | `docker build` principal ou CI verde com a mesma imagem |
| Rollback real nao executado | G5/G6 | Sem prova de retorno seguro | Testar rollback com tag anterior aprovada |
| Canario nao executado | G6 | Sem validacao em fluxo operacional controlado | Subir API candidata e rodar UAT minimo |
| Backup/restore homologado nao anexado | G2/G6 | Sem prova de recuperacao | Registrar backup, checksum e restore validado |
| Aprovao formal ausente | G6 | Sem aceite de negocio/operacao | Assinaturas Tech Lead, DBA, DevOps, QA e Sponsor |

## Decisao de release

**Nao liberar producao neste momento.**

O sistema avancou bem: os riscos de codigo, schema, testes locais e smoke
operacional contingencial estao sob controle no ambiente atual. A liberacao
deve esperar a prova do build reproduzivel do pipeline, rollback e aceite formal.

## Proxima acao recomendada

Retomar o G5 pelo caminho mais curto:

1. Normalizar a rede Docker para Node/npm ou usar registry fallback aprovado.
2. Construir `erp-evok-audio-server:<tag-imutavel>`.
3. Subir container da API contra `evok-postgres`.
4. Validar `/health/live` e `/health/ready`.
5. Executar rollback real.
6. Entao executar UAT/canario do G6.
