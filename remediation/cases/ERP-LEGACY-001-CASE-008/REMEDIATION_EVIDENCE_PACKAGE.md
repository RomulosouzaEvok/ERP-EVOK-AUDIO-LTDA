# REMEDIATION_EVIDENCE_PACKAGE (SanaCore -> VeriCore)

CASE_ID: `ERP-LEGACY-001-CASE-008`
FINDING_ID: `AUD-DB-02`
PROJECT_ID: `ERP-LEGACY-001`
TRACK: `Opção C / APR-2026-053`
BRANCH: `sana/ERP-LEGACY-001/CASE-008`
WORKTREE: `C:\Sistema EvokAudio\ERP-Evok-sana-CASE-008`
REMEDIATION_COMMIT: `a9102738bc9f011af222377525874b3647651933`
STATUS DESTE PACOTE: evidencia de implementacao. Nao declara `FINDING CLOSED`, `RETEST_PASSED` nem aceite de remediacao; essa autoridade permanece exclusiva da VeriCore.

---

## 1. ROOT_CAUSE

O servico de auditoria ja tentava reduzir perda silenciosa com retry e fallback, mas ainda tinha quatro lacunas dentro do escopo autorizado da Opcao C:

- O caminho fatal em `persistFailureAndAlert` fazia `console.error(JSON.stringify(entry))` fora de protecao. Payload circular, `BigInt` ou outro valor nao serializavel podia fazer o proprio fallback rejeitar.
- `logAction` continuava sendo usado como fire-and-forget em diversos chamadores; se o fallback rejeitasse, a promise flutuante podia virar `unhandledRejection`, e em Node 24 isso e caminho de encerramento de processo.
- O shutdown fechava HTTP e em seguida encerrava conexoes/saia sem esperar promises de auditoria ainda pendentes.
- O fallback de arquivo apontava para `logs/audit-failures.log`, mas o compose dev nao persistia `/app/logs`, e a imagem nao garantia `/app/logs` criado/chown para o usuario nao-root.

## 2. CORRECTION_STRATEGY

A estrategia adotada foi fechar somente a Opcao C autorizada, sem alterar a semantica transacional do sistema:

- `logAction` continua nao bloqueando resposta HTTP e nao propaga erro para os controllers.
- O corpo real da gravacao foi isolado em `performLogAction`; `logAction` agora registra a promise em um conjunto de pendencias e consome qualquer rejeicao internamente.
- O fallback usa serializacao segura para circular refs, `BigInt` e functions, evitando que o proprio log de falha gere nova falha fatal.
- Counters consultaveis foram adicionados para tornar falhas de auditoria visiveis (`getAuditFailureStats`), sem acoplar webhook/email ou fila duravel.
- `waitForPendingAuditLogs` drena promises pendentes durante shutdown, com timeout finito.
- Handlers de `unhandledRejection` e `uncaughtException` foram registrados cedo no boot.
- `/app/logs` ganhou volume persistente no compose dev, e o Dockerfile cria/chown `/app/logs` junto de `/app/uploads`.

Escopos explicitamente nao executados: nao tornar `logAction` transacional, nao propagar erro aos fluxos de negocio, nao tocar nos chamadores em massa, nao conectar webhook/email real, nao implementar fila duravel e nao editar `docker-compose.prod.yml`.

## 3. FILES_CHANGED

| Arquivo | Mudanca |
|---|---|
| `server/src/services/auditLogService.ts` | Tracking de promises pendentes, drain, serializacao segura, counters de falha e garantia de que `logAction` nao rejeita. |
| `server/src/config/processSafety.ts` | Registro idempotente de handlers globais de seguranca de processo. |
| `server/index.ts` | Registro cedo dos handlers e drain de audit logs antes de `sequelize.close()`. |
| `server/Dockerfile` | Criacao de `/app/logs` e chown para usuario nao-root `evok`. |
| `docker-compose.yml` | Volume persistente `app_logs:/app/logs` no servico `api`. |
| `server/tests/unit/case008-audit-log-runtime.test.ts` | Regressao runtime para payload circular, drain e counters de falha. |
| `server/tests/unit/case008-audit-log-static.test.ts` | Regressao estatica para handlers, ordem de shutdown e persistencia de logs. |

## 4. TESTS_ADDED

- `server/tests/unit/case008-audit-log-runtime.test.ts`
- `server/tests/unit/case008-audit-log-static.test.ts`

Os testes mockam `../../src/models/AuditLog`; nao importam `app.ts` e nao abrem conexao de banco.

## 5. BEFORE_FIX_PROOF

Prova vermelha executada contra `AUDIT_COMMIT` `c1311a6f76b512fef893f7e60d934179cae3409f`, em copia temporaria isolada:

```powershell
git archive c1311a6f76b512fef893f7e60d934179cae3409f -o $temp\audit.tar
tar -xf $temp\audit.tar
Copy-Item server/tests/unit/case008-audit-log-runtime.test.ts $temp\server\tests\unit\
Copy-Item server/tests/unit/case008-audit-log-static.test.ts $temp\server\tests\unit\
cd $temp\server
npm ci
npm test -- --runInBand tests/unit/case008-audit-log-runtime.test.ts tests/unit/case008-audit-log-static.test.ts
```

Resultado esperado e observado: `FAIL`, 2 suites falharam, 6 testes falharam.

Falhas relevantes observadas:

- `service.__resetAuditLogRuntimeStateForTests is not a function`
- `server/src/config/processSafety.ts` inexistente.
- `waitForPendingAuditLogs` nao encontrado antes de `sequelize.close()`.
- `docker-compose.yml` sem `- app_logs:/app/logs`.

Isso demonstra que os testes novos capturam lacunas reais existentes no commit auditado.

## 6. AFTER_FIX_PROOF

Comandos executados na worktree de remediacao:

```powershell
cd C:\Sistema EvokAudio\ERP-Evok-sana-CASE-008\server
npm test -- --runInBand tests/unit/audit-log-failure-alerting.test.ts tests/unit/audit-log-action-downgrade.test.ts tests/unit/audit-log-register-normalization.test.ts tests/unit/case008-audit-log-runtime.test.ts tests/unit/case008-audit-log-static.test.ts
npm run typecheck
npm run build
```

Resultados:

- `PASS`: 5 suites, 19 testes.
- `npm run typecheck`: `tsc -p tsconfig.json --noEmit` passou.
- `npm run build`: `tsc -p tsconfig.build.json` passou.

Observacao operacional: uma tentativa de rodar `typecheck` e `build` em paralelo falhou por limite ambiental de memoria/paginacao do Windows (`errno=1455`). A validacao conclusiva foi repetida sequencialmente e passou.

## 7. REGRESSION_ANALYSIS

- O comportamento de negocio segue fire-and-forget: falha de auditoria nao bloqueia resposta HTTP.
- Falhas de auditoria deixam de depender de `JSON.stringify` inseguro no fallback.
- Promises pendentes passam a ser drenaveis no shutdown sem espera infinita.
- Logs de fallback persistem em volume dev e o caminho existe com ownership adequado na imagem.
- `docker-compose.prod.yml` ja declarava volume de logs em `/app/logs`; nao foi editado. A criacao/chown no Dockerfile remove a armadilha de EACCES tambem para a imagem usada em producao, dentro do escopo autorizado.

## 8. IMPACT

ARCHITECTURE_IMPACT: baixo. Mudanca restrita a runtime safety do servico de auditoria, boot/shutdown e infra de volume.

DATABASE_IMPACT: nenhum schema, migration ou dado alterado. Nenhuma conexao de banco foi aberta por estes testes.

API_IMPACT: nenhum endpoint novo ou alterado.

SECURITY_CHECKS:

- Nao houve acesso a `erp_evok_audio` de producao.
- Nao houve mudanca em `server/package.json`, `runtimeEnv.ts`, `server/app.ts`, `audit/`, `coretriad/governance/`, `coretriad/states/` ou `.claude/`.
- O fallback agora e fail-safe contra payload circular/`BigInt`.
- `unhandledRejection` e `uncaughtException` deixam rastro em logger central.

## 9. RESIDUAL_RISK

- Nao foi implementada fila duravel, por decisao explicita de escopo da Opcao C.
- Nao foi conectado webhook/email real, por decisao explicita de escopo.
- Counters sao consultaveis via modulo, mas este caso nao expôs endpoint/metric pipeline novo.
- O reteste da VeriCore deve validar o comportamento em ambiente containerizado com volume real de `/app/logs`.

## 10. RETEST_INSTRUCTIONS

Sugestoes para a VeriCore, sem substituir sua autoridade:

- Reexecutar os dois testes novos do CASE-008 e os testes legados de audit log listados em `AFTER_FIX_PROOF`.
- Validar que `logAction` resolve mesmo com payload circular/`BigInt` quando `AuditLog.register` falha.
- Validar que `waitForPendingAuditLogs` e chamado antes de `sequelize.close()` em shutdown.
- Subir container ou inspecionar imagem/compose para confirmar `/app/logs` persistente e gravavel pelo usuario nao-root.
- Confirmar que nao houve propagacao de erro de auditoria para fluxo de negocio.

## 11. CORRECAO_01

Escopo desta correcao: fechar os tres riscos bloqueantes apontados para o CASE-008 sem mudar a Opcao C nem tocar em governance/audit/.

### 11.1 Problemas e correcoes

| Problema | Causa original | Correcao aplicada |
|---|---|---|
| 1. `uncaughtException` nao matava o processo | `server/src/config/processSafety.ts:18-45` | `server/src/config/processSafety.ts:18-70` passou a aceitar `fatalShutdown` e `fatalShutdownTimeoutMs`; `server/index.ts:21-68` agora encaminha `uncaughtException` para o mesmo `shutdown()` com fallback curto de saida. |
| 2. webhook de auditoria podia ficar pendurado sem timeout | `server/src/services/auditLogService.ts:155-159` | `server/src/services/auditLogService.ts:36, 155-159` passou a usar `AbortSignal.timeout(WEBHOOK_FETCH_TIMEOUT_MS)`; o dreno continua em `server/src/services/auditLogService.ts:187-210`, mas agora nao espera indefinidamente por webhook travado. |
| 3. orcamentos de shutdown e grace period do Docker estavam incoerentes | `server/index.ts:21-68`, `docker-compose.yml:33-55`, `docker-compose.prod.yml:65-85` | `server/index.ts:21-68` ajustou os tempos para `NORMAL_SHUTDOWN_FORCED_EXIT_MS = 25000`, `NORMAL_AUDIT_DRAIN_TIMEOUT_MS = 10000`, `FATAL_SHUTDOWN_FORCED_EXIT_MS = 5000`, `FATAL_AUDIT_DRAIN_TIMEOUT_MS = 3000`; `docker-compose.yml:42` e `docker-compose.prod.yml:72` passaram a declarar `stop_grace_period: 35s`. |

### 11.2 Prova vermelha

- Problema 1: o handler original de `uncaughtException` so logava e setava `process.exitCode = 1`; nao havia handoff para o shutdown gracioso do servidor.
- Problema 2: a primeira reproducao do teste de webhook lento mostrou o dreno preso ate estourar o timeout de observacao quando a promessa de webhook nao terminava, com resultado `drained: false`, `pendingActions: 1`, `timedOut: true`.
- Problema 3: inspecao do compose original mostrava ausencia de `stop_grace_period`, enquanto o processo tinha `forcedExit` e dreno internos sem margem de container.

### 11.3 Prova verde

- `server/tests/unit/case008-correction01.test.ts:28-57` valida que uma excecao nao capturada aciona o shutdown fatal e o processo termina com codigo `1` quando o shutdown nao conclui a tempo.
- `server/tests/unit/case008-correction01.test.ts:59-122` valida que o fetch do webhook recebe timeout, o evento de auditoria termina e o dreno conclui sem ficar pendurado.
- `server/tests/unit/case008-audit-log-static.test.ts:6-37` valida a costura estatica do shutdown e o `stop_grace_period` nos dois compose files.

### 11.4 Outputs reais

Validacao final executada na worktree:

```powershell
cd C:\Sistema EvokAudio\ERP-Evok-sana-CASE-008\server
npm test -- --runInBand tests/unit/case008-correction01.test.ts tests/unit/case008-audit-log-static.test.ts tests/unit/case008-audit-log-runtime.test.ts tests/unit/audit-log-failure-alerting.test.ts
npm run typecheck
npm run build
```

Saida real observada:

```text
> erp-evok-audio-server@1.0.0 test
> jest --runInBand --runInBand tests/unit/case008-correction01.test.ts tests/unit/case008-audit-log-static.test.ts tests/unit/case008-audit-log-runtime.test.ts tests/unit/audit-log-failure-alerting.test.ts

Test Suites: 4 passed, 4 total
Tests:       11 passed, 11 total
Snapshots:   0 total
Time:        6.504 s, estimated 7 s
Ran all test suites matching tests/unit/case008-correction01.test.ts|tests/unit/case008-audit-log-static.test.ts|tests/unit/case008-audit-log-runtime.test.ts|tests/unit/audit-log-failure-alerting.test.ts.
```

```text
> erp-evok-audio-server@1.0.0 typecheck
> tsc -p tsconfig.json --noEmit
```

```text
> erp-evok-audio-server@1.0.0 build
> tsc -p tsconfig.build.json
```

---

REMEDIATION_COMPLETE
