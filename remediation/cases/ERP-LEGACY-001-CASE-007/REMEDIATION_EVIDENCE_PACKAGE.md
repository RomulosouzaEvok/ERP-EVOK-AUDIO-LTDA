# REMEDIATION_EVIDENCE_PACKAGE - ERP-LEGACY-001-CASE-007

```
CASE_ID:             ERP-LEGACY-001-CASE-007
FINDING_ID:          AUD-AUTHN-03
AUDIT_COMMIT:        c1311a6f76b512fef893f7e60d934179cae3409f
BRANCH:              sana/ERP-LEGACY-001/CASE-007
REMEDIATION_COMMIT:  ef4b8457a686347ca9ef9d39f0264197ffee19d9
EXECUTOR:            Codex como sanacore-remediation-engineer
STATUS:              REMEDIATION_COMPLETE
```

> Este pacote documenta a remediacao implementada pela SanaCore. Nao declara `FINDING CLOSED` nem `RETEST_PASSED`; essa autoridade permanece exclusiva da VeriCore.

## 1. Causa-raiz

O defeito estava em `server/app.ts`: a chave do limiter geral da API era derivada de `jwt.decode` antes da autenticacao. Como `jwt.decode` nao verifica assinatura, um atacante podia escolher arbitrariamente o `id` do payload e, portanto, escolher o bucket do rate limiter.

Efeitos provados pela triagem:

- V1: rotacao de tokens forjados com ids diferentes pulverizava a cota.
- V2: token forjado com id de vitima podia consumir a cota de outro usuario.
- V2b: `/api/auth/refresh` tinha limiter dedicado antes de `authenticate`, tambem consumivel por token forjado.
- V3: login spraying podia ser amplificado porque a protecao por conta nao substituia uma cota agregada por IP real.

## 2. Estrategia de correcao

A correcao separou as fronteiras de confianca:

- Antes de autenticar, a API aplica somente cota por IP real: `1600/min/IP`.
- Depois de `jwt.verify` e depois de carregar o usuario real, `authenticate` aplica cota por usuario autenticado: `300/15min/usuario`.
- `/api/auth/refresh` deixou de ter limiter pre-auth baseado em token decodificado; a cota especifica de refresh agora roda apenas apos usuario autenticado.
- Login e recuperacao de senha preservam a chave por `IP + email`, mas a camada global por IP tambem passa a existir para `/api/*`.
- Todo 429 emitido pelos limiters centralizados registra evento `rate_limit_exceeded` no logger com requestId, path, limiter, keySource, IP, limite e janela.

## 3. Decisoes D1-D5

| Decisao | Atendimento |
|---|---|
| D1 - IP `1600/min` | `RATE_LIMIT_IP_MAX_PER_MINUTE = 1600`, usado por `apiIpLimiter` com janela de 1 minuto. |
| D2 - cota combinada, usuario `300/15min` | `apiIpLimiter` roda em `/api`; `authenticatedUserLimiter` roda dentro de `authenticate` apos usuario real, com `RATE_LIMIT_AUTHENTICATED_USER_MAX_PER_15_MINUTES = 300`. |
| D3 - TRUST_PROXY | `app.set('trust proxy', runtimeEnv.trustProxy)` foi preservado; nenhuma variavel nova foi criada. |
| D4 - 429 observavel | `rateLimitHandler` chama `logger.warn('rate_limit_exceeded', ...)` antes de responder 429. |
| D5 - nao esperar rotacao CASE-005 | Correcao nao depende de rotacao de segredo JWT; tokens forjados sem assinatura valida nao escolhem bucket autenticado. |

## 4. Arquivos alterados

| Arquivo | Mudanca |
|---|---|
| `server/app.ts` | Removeu `jwt.decode`, `apiRequestKey`, `apiLimiter` e `refreshLimiter` pre-auth; passou a montar `apiIpLimiter` global e limiters publicos centralizados. |
| `server/src/middlewares/auth.ts` | Apos `jwt.verify`, carga do usuario e montagem de `req.user`, chama `applyAuthenticatedRateLimits`. |
| `server/src/middlewares/rateLimitPolicy.ts` | Novo modulo central de politica de rate-limit, constantes D1/D2, key generators testaveis, limiters e log observavel de 429. |
| `server/tests/unit/case007-rate-limit-source.test.ts` | Regressao de fonte: falha se producao voltar a usar `jwt.decode` ou refresh limiter pre-auth. |
| `server/tests/unit/case007-rate-limit-policy.test.ts` | Regressao de politica: tokens forjados nao escolhem bucket, ids forjados colapsam por IP, usuario real so entra apos `req.user`, e D1/D2 ficam explicitados. |

## 5. Evidencia de teste - antes

Estado anterior medido fora da worktree por `git archive`, sem revert in-place:

```
AUDIT_COMMIT: c1311a6f76b512fef893f7e60d934179cae3409f
Temp tree: C:\Users\Gilwagno\AppData\Local\Temp\case007-audit-d7e5ef64efaf4541b936d41067da3bae
Command: npm test -- --runInBand tests/unit/case007-rate-limit-source.test.ts
Result: FAIL
Suites: 1 failed, 1 total
Tests: 2 failed, 2 total
Falhas:
- app.ts listado como offender por conter jwt.decode
- app.ts continha app.use('/api/auth/refresh', refreshLimiter) antes de authenticate
```

## 6. Evidencia de teste - depois

Comandos executados na worktree `C:\Sistema EvokAudio\ERP-Evok-sana-CASE-007`:

```
server> npm ci
Result: PASS (node_modules instalado na propria worktree; npm audit reportou 1 vulnerabilidade high preexistente no grafo)

server> npm test -- --runInBand tests/unit/case007-rate-limit-source.test.ts tests/unit/case007-rate-limit-policy.test.ts
Result: PASS
Suites: 2 passed, 2 total
Tests: 7 passed, 7 total

server> npm test -- --runInBand tests/unit/auth-refresh.test.ts tests/unit/change-password-session-invalidation.test.ts
Result: PASS
Suites: 2 passed, 2 total
Tests: 9 passed, 9 total

server> npm run typecheck
Result: PASS
tsc -p tsconfig.json --noEmit

client> npm ci
Result: PASS

client> npm run build
Result: PASS
tsc -b && vite build
```

## 7. Lacunas declaradas

`mobile> npm ci` nao foi conclusivo porque `mobile/package.json` e `mobile/package-lock.json` ja estavam fora de sincronia no baseline da worktree. A instalacao falhou com `EUSAGE` e lista de dependencias ausentes no lock, incluindo `react-dom@19.2.8` e pacotes Metro/React Native. Por restricao de escopo, a remediacao de AUD-AUTHN-03 nao atualizou lockfile do mobile.

VeriCore deve confirmar o typecheck mobile apos reconciliar ou aprovar explicitamente o lockfile mobile. Esta lacuna nao afeta os arquivos de servidor alterados, mas fica declarada para nao ser confundida com gate executado.

## 8. Observacoes

- Nenhuma conexao com banco foi usada.
- Nenhum segredo foi lido ou registrado.
- Nenhum arquivo em `audit/`, `coretriad/`, `coretriad/states/`, `coretriad/governance/` ou `.claude/` foi alterado.
- `server/package.json` nao foi alterado.

## 9. CORRECAO_01

Escopo desta correcao: fechar o V3 de password spraying e tornar `TRUST_PROXY`
obrigatorio em producao, sem tocar nos vetores V1, V2 e V2b que ja estavam
corretos.

### 9.1 Problemas corrigidos

| Problema | Causa original | Correcao aplicada |
|---|---|---|
| 1. Spraying com e-mails diferentes e mesmo IP escapava do rate limit | `server/src/middlewares/rateLimitPolicy.ts:48-59` so criava a chave `(ip,email)` em `loginAttemptAccountKey`; `server/app.ts:58-62` montava apenas esse limiter no login | `server/src/middlewares/rateLimitPolicy.ts:22,48-59,131-142,241-249` agora expõe `RATE_LIMIT_LOGIN_IP_MAX_PER_15_MINUTES`, `loginAttemptIpKey`, `createLoginAttemptIpLimiter` e `loginAttemptIpLimiter`; `server/app.ts:13,61-62` monta o limiter por IP e o limiter por conta no login |
| 2. `TRUST_PROXY` podia ficar 0/ausente em producao e colapsar toda a fabrica num unico balde | `server/src/config/runtimeEnv.ts:59,73-171` aceitava `TRUST_PROXY=0` sem trava de producao; `server/app.ts:32` repassava o valor cru para `app.set('trust proxy', ...)` | `server/src/config/runtimeEnv.ts:59,73-171` agora reprova `TRUST_PROXY <= 0` quando `NODE_ENV=production`; os testes de producao foram ajustados para exigir `TRUST_PROXY=1` nas baselines reais |
| 3. Move de constantes de rate limit para o schema Zod | Fora do escopo desta entrega; seria uma refatoracao maior do que a correcao pedida | Nao foi alterado nesta correcao. Fica como pendencia separada, sem bloquear o fechamento dos problemas bloqueantes |

### 9.2 Prova vermelha

- Antes da correcao, a triagem ja registrava que `loginAttemptKey` dava 10
  tentativas por `(ip,email)` e que 20 e-mails distintos do mesmo IP geravam
  20 orcamentos independentes (`TRIAGE.md:249-270`, `TRIAGE.md:539`).
- Antes da correcao, `TRUST_PROXY` era apenas um `default(0)` no schema
  (`server/src/config/runtimeEnv.ts:59`) e nao havia validacao de boot em
  producao, o que permitia subir atras de proxy com `req.ip` colapsado no IP
  do proxy.

### 9.3 Prova verde

- `server/tests/unit/case007-login-spraying.test.ts:14-55` prova o novo
  comportamento: tres tentativas com e-mails diferentes e mesmo IP passam;
  a quarta vira `429` e gera `rate_limit_exceeded` com `limiter=login_ip`.
- `server/tests/unit/case007-rate-limit-policy.test.ts:29-63` confirma os
  novos identificadores de chave e a cota agregada por IP para login.
- `server/tests/unit/case007-rate-limit-source.test.ts:12-22` confirma que o
  `loginAttemptIpLimiter` foi montado no `app.ts` antes do router de auth.
- `server/tests/unit/runtime-env.test.ts:98-130` confirma que producao falha
  quando `TRUST_PROXY` esta ausente ou explicitamente `0`, e sobe quando
  recebe um valor valido.
- `server/tests/unit/runtime-env-production-tracking.test.ts:42-49` e os
  demais testes de producao receberam `TRUST_PROXY=1` na baseline, provando
  que a nova validacao nao bloqueia dev/test, apenas producao mal configurada.

### 9.4 Outputs reais

Validacao final executada na worktree:

```powershell
cd C:\Sistema EvokAudio\ERP-Evok-sana-CASE-007\server
npm test -- --runInBand tests/unit/case007-login-spraying.test.ts tests/unit/case007-rate-limit-source.test.ts tests/unit/case007-rate-limit-policy.test.ts tests/unit/runtime-env.test.ts tests/unit/runtime-env-production-tracking.test.ts tests/unit/database-config.test.ts tests/unit/logger.test.ts tests/unit/seeds-production-boot.test.ts
npm run typecheck
npm run build
```

Saida real observada:

```text
> erp-evok-audio-server@1.0.0 test
> jest --runInBand --runInBand tests/unit/case007-login-spraying.test.ts tests/unit/case007-rate-limit-source.test.ts tests/unit/case007-rate-limit-policy.test.ts tests/unit/runtime-env.test.ts tests/unit/runtime-env-production-tracking.test.ts tests/unit/database-config.test.ts tests/unit/logger.test.ts tests/unit/seeds-production-boot.test.ts

Test Suites: 8 passed, 8 total
Tests:       33 passed, 33 total
Snapshots:   0 total
Time:        18.693 s
Ran all test suites matching tests/unit/case007-login-spraying.test.ts|tests/unit/case007-rate-limit-source.test.ts|tests/unit/case007-rate-limit-policy.test.ts|tests/unit/runtime-env.test.ts|tests/unit/runtime-env-production-tracking.test.ts|tests/unit/database-config.test.ts|tests/unit/logger.test.ts|tests/unit/seeds-production-boot.test.ts.
```

```text
> erp-evok-audio-server@1.0.0 typecheck
> tsc -p tsconfig.json --noEmit
```

```text
> erp-evok-audio-server@1.0.0 build
> tsc -p tsconfig.build.json
```

REMEDIATION_COMPLETE
