# Readiness de Go-Live - ERP EVOK AUDIO

**Data:** 2026-07-31  
**Ambiente avaliado:** Windows + Docker Desktop + PostgreSQL local isolado  
**Decisao atual:** nao liberar producao ate concluir UAT de negocio, ambiente
de hospedagem real para o canario e aprovacao formal (G0-G5 ja comprovados)

## Atualizacao 2026-07-31 (segunda rodada)

O bloqueio de rede do Docker Desktop relatado anteriormente nao reproduziu
nesta sessao: `docker build ./server` completou com sucesso usando o
Dockerfile multi-stage principal (nao mais a imagem de contingencia). O
container final sobe como `uid=999(evok)`, conecta no Postgres real,
responde `200` em `/health/live` e `/health/ready`, e encerra de forma
graciosa com `SIGTERM` (sem exigir `SIGKILL`). G5 esta aprovado.

Alem disso, nesta rodada:
- G2 foi fechado com backup/restore real testado (`docs/BACKUP_RESTORE_G2_2026-07-31.md`).
- G3 teve dois gaps reais de RBAC corrigidos (`clients`, `suppliers`) e dois
  itens que os documentos tratavam como pendentes foram implementados:
  SEC-10 (invalidacao de sessao por `password_version`) e SEC-11 (JWT com
  `issuer`/`audience`).
- G4 teve um bug real de producao corrigido: o lock pessimista de
  cancelamento de venda e recebimento de compra usava `FOR UPDATE` sobre um
  outer join, o que o PostgreSQL rejeita com erro e derrubaria essas rotas
  com HTTP 500. Corrigido e coberto por 3 novos testes de concorrencia real.

## Resumo

O backend esta tecnicamente consistente nas validacoes locais, com migrations
aplicadas no PostgreSQL do projeto, suites estritas sem skips, secret scan limpo
e auditoria de dependencias sem vulnerabilidades conhecidas de producao.

O smoke operacional da API foi validado com a imagem final gerada pelo
Dockerfile principal (nao mais uma imagem de contingencia). Os gates G0 a G5
estao tecnicamente aprovados. O go-live permanece bloqueado apenas por itens
que exigem decisao/execucao humana: UAT de negocio, ambiente real de
hospedagem para o canario e aprovacao formal assinada (ver G6 em
`docs/UAT_RELEASE_G6_2026-07-31.md`).

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
| Build principal | `docker build ./server` (Dockerfile multi-stage oficial) | PASS |
| Smoke Docker principal | `/health/live` e `/health/ready` (imagem oficial) | 200 |
| Smoke Docker principal | usuario do container oficial | `uid=999(evok)` |
| Smoke Docker principal | `docker stop -t 10` (shutdown gracioso) | `SIGTERM` tratado, sem `SIGKILL` |
| Backup/restore | `docs/BACKUP_RESTORE_G2_2026-07-31.md` | RPO 0.9s, RTO 1.3s, contagens identicas |
| Rollback de migration | `npm run migration:down` em banco isolado | PASS |

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
| ~~Build Dockerfile/CI principal nao concluido~~ | G5 | Resolvido | `docker build ./server` concluido com sucesso em 2026-07-31; smoke com `/health/live` e `/health/ready` em 200 |
| ~~Rollback nao executado~~ | G2 | Resolvido | `migration:down` testado em banco isolado (`docs/BACKUP_RESTORE_G2_2026-07-31.md`) |
| ~~Backup/restore homologado nao anexado~~ | G2 | Resolvido | Backup real + restore em container isolado, contagens validadas |
| Canario nao executado | G6 | Sem validacao em ambiente real de hospedagem | Definir ambiente real e subir API candidata + UAT |
| Aprovacao formal ausente | G6 | Sem aceite de negocio/operacao | Assinaturas Tech Lead, DBA, DevOps, QA e Sponsor |

## Decisao de release

**Nao liberar producao neste momento.**

Os gates G0 a G5 estao tecnicamente aprovados com evidencia reproduzida nesta
sessao. Os unicos bloqueios restantes sao organizacionais: um ambiente real de
hospedagem para o canario e a aprovacao formal do negocio (G6). Nenhum deles
pode ser resolvido por trabalho de codigo adicional.

## Proxima acao recomendada

1. Escolher e provisionar o ambiente real onde o canario vai rodar (servidor/nuvem definido pela EVOK AUDIO).
2. Executar o roteiro de UAT de `docs/UAT_RELEASE_G6_2026-07-31.md` com QA/Sponsor.
3. Rodar o deploy canario nesse ambiente, com backup pre-janela e rollback testado.
4. Coletar as assinaturas formais de Tech Lead, DBA, DevOps, QA e Sponsor.
