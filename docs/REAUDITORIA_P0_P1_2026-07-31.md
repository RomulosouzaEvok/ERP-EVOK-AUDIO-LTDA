# Reauditoria P0/P1 - ERP EVOK AUDIO

**Data:** 2026-07-31  
**Escopo:** rechecagem dos achados P0/P1 da auditoria de producao  
**Fonte:** `docs/AUDITORIA_PRODUCAO_2026-07-30.md`  
**Resultado:** maioria corrigida por codigo/testes; smoke local-runtime validado; release segue bloqueada por build CI definitivo

## Resumo executivo

O backend teve os principais achados P0/P1 tratados em codigo, configuracao,
migrations, testes e documentacao. As suites locais de typecheck, build, testes
unitarios, suites API estritas, secret scan e audit ja passaram em execucoes
anteriores do ciclo G5. O bloqueio atual e operacional: Node/npm dentro do Docker
Desktop falha em HTTPS para `registry.npmjs.org` com `ECONNRESET`, impedindo a
construcao final da imagem da API pelo Dockerfile principal.

## Achados P0

| Achado | Status | Evidencia | Risco residual |
|---|---|---|---|
| AUD-0001 Consolidar entrypoints | Corrigido | `server/app.ts` centraliza app; `server/index.ts` faz bootstrap/listen | nenhum conhecido |
| AUD-0002 Runtime nao depender de `tsx` | Corrigido | `start` aponta para `node dist/index.js`; `zod` em dependencies | smoke Docker final ainda pendente |
| AUD-0003 Remover `rejectUnauthorized: false` | Corrigido | config exige TLS/CA em producao e usa `rejectUnauthorized: true` | teste com PostgreSQL TLS real pendente |
| AUD-0004 Bloquear DDL automatico em producao | Corrigido | `DB_FORCE_SYNC`/`DB_AUTO_ALTER` bloqueados no boot/config | nenhum conhecido |

## Achados P1

| Achado | Status | Evidencia | Risco residual |
|---|---|---|---|
| AUD-0005 RBAC em baixas financeiras | Corrigido | rotas financeiras criticas protegidas por role e testes 403 | sponsor ainda deve aprovar matriz |
| AUD-0006 Locks em operacoes criticas | Corrigido | repositorios/use cases usam transacao/lock em vendas, compras e financeiro | teste concorrente real em canario ainda pendente |
| AUD-0007 Troca de senha | Corrigido | fluxo e testes de invalidacao de token implementados anteriormente | UAT deve validar politica aprovada |
| AUD-0008 Rate limit distribuido | Parcial/risco aceito tecnico | rate limit local documentado; distribuido depende de topologia multi-instancia | exigir Redis se houver mais de uma instancia |
| AUD-0009 Invalidacao pos-mudanca de senha | Corrigido | token valida estado de usuario/senha conforme politica implementada | UAT deve cobrir sessao antiga |
| AUD-0010 CI, imagem e rollback | Parcial | Dockerfile, compose, CI e runbook existem | imagem API bloqueada por HTTPS Node/npm no Docker Desktop |
| AUD-0011 Suites obrigatorias sem skips | Corrigido | scripts `test:*:strict` falham se houver skips indevidos | manter no CI |
| AUD-0012 Atualizar uuid | Corrigido | override para `uuid` >= 11.1.1 e `npm audit --omit=dev` passou no ciclo G5 | revalidar apos novo `npm ci` |

## Evidencias tecnicas recentes

| Validacao | Resultado registrado |
|---|---|
| `npm run typecheck` | PASS |
| `npm run build` | PASS |
| `npm run test:unit:strict` | PASS |
| `npm run test:api:strict` | PASS |
| `npm run scan:secrets` | PASS |
| `npm audit --omit=dev` | PASS |
| `docker compose up -d postgres` | PASS |
| `docker inspect evok-postgres` | `running healthy` |
| `docker exec evok-postgres pg_isready -U evok_admin -d erp_evok_audio` | PASS |
| Build Docker API local-runtime | PASS com `scripts/build-g5-local-runtime-image.ps1` |
| `/health/live` e `/health/ready` na imagem local-runtime | PASS |
| Usuario nao-root na imagem local-runtime | PASS (`uid=999(evok)`) |
| Build Dockerfile principal | BLOQUEADO por instabilidade Node/npm HTTPS |

## Bloqueio operacional aberto

O log `httpproxy.log` do Docker Desktop registrou falha ao intermediar HTTPS:

```text
HTTP GET https://registry.npmjs.org/-/ping: replying 500
handleHTTPS doing request: Get "https://registry.npmjs.org/-/ping": EOF
```

Testes indicaram:

- Host Windows acessa `registry.npmjs.org`.
- Docker Hub baixa imagens normalmente.
- BusyBox acessa HTTPS dentro do container.
- Node/npm dentro do container falha com `ECONNRESET`.
- `registry.npmmirror.com` responde `PONG` via npm dentro do container.

## Decisao de release

Release de producao permanece bloqueada ate:

- Build reproduzivel da imagem API pelo Dockerfile principal/CI ser concluido.
- Container da API iniciar como usuario nao-root.
- `/health/live` e `/health/ready` retornarem 200.
- Rollback real ser testado com tag anterior aprovada.
- UAT/canario serem assinados por QA, DevOps, DBA, Tech Lead e Sponsor.
