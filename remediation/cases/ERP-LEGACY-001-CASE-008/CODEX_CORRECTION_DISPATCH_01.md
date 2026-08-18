# Despacho de correção — CORREÇÃO 01 — `ERP-LEGACY-001-CASE-008`

```
CASE_ID:      ERP-LEGACY-001-CASE-008
FINDING_ID:   AUD-DB-02
ESCOPO:       Correção de 3 problemas achados na segunda opinião aprofundada
              (2 bloqueantes, 1 alta prioridade) sobre commit a910273
BRANCH:       sana/ERP-LEGACY-001/CASE-008
WORKTREE:     C:\Sistema EvokAudio\ERP-Evok-sana-CASE-008
DESTINO:      sanacore-remediation-engineer / Codex
```

## 1. Contexto

O veredito "APROVA" anterior sobre este caso foi dado numa revisão
declaradamente rasa (limitação de sessão registrada no commit `752b6d8`). A
VeriCore aprofundou e achou 3 problemas reais que a revisão rasa não pegou —
2 deles são regressões introduzidas pela própria remediação, não o defeito
original. Este despacho corrige os 3. Não reabra o que já está correto
(Opção C respeitada, `safeJsonStringify` tratando circular/BigInt/function).

## 2. Problema 1 (BLOQUEANTE) — handler de `uncaughtException` transforma fail-fast em zumbi

`server/src/config/processSafety.ts:25-28`:

```ts
process.on('uncaughtException', (error) => {
  logger.error(`Uncaught exception: ${describeReason(error)}`);
  process.exitCode = 1;
});
```

Registrar um listener de `uncaughtException` suprime o comportamento default
do Node de abortar o processo. `process.exitCode = 1` só define o código de
saída para quando o event loop esvaziar — o que num servidor HTTP com
`app.listen()` ativo nunca acontece. Não há `process.exit()`, não há
chamada a `shutdown()`.

Resultado: antes deste handler, uma exceção não capturada matava o
container e o orquestrador reiniciava limpo (fail-closed). Depois, o
processo **continua servindo requisições com estado potencialmente
corrompido**, e o healthcheck de `docker-compose.yml:79` continua
respondendo 200 — nada o remove do balanceamento. Isso não estava autorizado
por `APR-2026-053` (D3 autorizou tocar `docker-compose.yml`/`Dockerfile`;
D4 decidiu não conectar webhook — handler global de processo não foi
autorizado por nenhum dos dois).

**Correção exigida:** o handler de `uncaughtException` deve, depois de
logar, encerrar o processo de forma controlada — chamar a mesma rotina de
`shutdown()` já usada no encerramento normal (ver `server/index.ts`), com um
fallback de `process.exit(1)` caso o shutdown gracioso não complete dentro
de um tempo curto. Não deixar o processo vivo servindo requisições depois de
uma exceção não capturada.

## 3. Problema 2 (BLOQUEANTE) — fail-open real no dreno do webhook de auditoria

`server/src/services/auditLogService.ts`, chamada de `fetch(webhookUrl, ...)`
(~linha 154-160): sem `AbortSignal`/timeout. Cadeia do defeito:

1. `logAction` envolve tudo em `trackAuditAction`, que entra em
   `pendingAuditActions`.
2. Se o banco falhar e `AUDIT_ALERT_WEBHOOK_URL` estiver configurado e o
   destino pendurar o socket, o `await fetch(...)` fica pendente
   indefinidamente.
3. No shutdown, `server/index.ts` chama `waitForPendingAuditLogs(10000)`,
   que expira em 10s, loga e **prossegue** para `sequelize.close()`.
4. O evento de auditoria é perdido silenciosamente — fail-open, no exato
   mecanismo que este caso existe para consertar.

O commit `a910273` tocou esse bloco (`auditFailureStats.webhookFailures += 1`)
sem corrigir a ausência de timeout.

**Correção exigida:** adicionar timeout ao `fetch` do webhook (ex.:
`signal: AbortSignal.timeout(N)`, com N curto — poucos segundos, não os 10s
do dreno geral) para que uma falha de rede no webhook não segure a promise
indefinidamente. Um webhook lento deve falhar rápido e ser contabilizado em
`auditFailureStats`, não travar o processo de dreno.

## 4. Problema 3 (ALTA) — orçamento de shutdown mal dimensionado para container

`server/index.ts`: `forcedExit` em 15s; dreno de auditoria pede 10s. Se
`server.close()` levar mais de 5s (conexões keep-alive), `process.exit(1)`
do `forcedExit` dispara **antes** de `sequelize.close()`.

Nem `docker-compose.yml` nem `docker-compose.prod.yml` declaram
`stop_grace_period` — o default do Docker é 10s, depois SIGKILL. Um dreno de
10s empilhado após `server.close()` nunca termina dentro do grace period em
produção — o dreno não drena de fato em container, mesmo funcionando no
teste local.

**Correção exigida:** declarar `stop_grace_period` explícito em
`docker-compose.yml` e `docker-compose.prod.yml` com margem suficiente para
`server.close()` + dreno de auditoria + margem de segurança (ex.: se o dreno
pede até 10s e o `forcedExit` do processo é 15s, o `stop_grace_period` do
Docker precisa ser maior que 15s, não igual nem menor). Ajustar também os
orçamentos internos (`forcedExit`, dreno) para que a soma seja coerente e
documentada — não precisa ser exatamente os mesmos números, mas a relação
`stop_grace_period do Docker > forcedExit do processo > dreno de auditoria`
precisa valer, com uma margem clara.

## 5. O que já está certo — não mexer

- Opção C respeitada: zero call site tocado, zero throw novo introduzido no
  fluxo principal de auditoria, webhook não conectado por padrão (D4).
- `safeJsonStringify` (tratamento de circular, BigInt, function com fallback
  próprio no catch) — correto, manter.
- `docker-compose.prod.yml` intocado onde não precisa (fora da adição do
  `stop_grace_period` pedida no Problema 3).

## 6. Prompt literal para colar no Codex

```text
Você está atuando como sanacore-remediation-engineer dentro da estrutura CoreTriad deste repositório.

Isto é uma CORREÇÃO 01 sobre a remediação já existente do CASE-008 (AUD-DB-02, commit a910273). NÃO é reimplementação — mantenha a Opção C (zero call site tocado, webhook não conectado por padrão) e o safeJsonStringify, que estão corretos.

Trabalhe exclusivamente na worktree/branch já existente:
  worktree: C:\Sistema EvokAudio\ERP-Evok-sana-CASE-008
  branch:   sana/ERP-LEGACY-001/CASE-008

Regras absolutas:
- NÃO conecte em erp_evok_audio (produção).
- Não execute operação destrutiva em banco real. Testes de integração HTTP somente contra erp_evok_audio_test.
- Não toque em audit/, coretriad/governance/, coretriad/states/, .claude/.
- Não declare FINDING CLOSED nem RETEST_PASSED.
- Capture e registre o OUTPUT REAL dos comandos executados (typecheck, testes), não apenas a alegação em texto.

Leitura obrigatória antes de editar:
1. Leia server/src/config/processSafety.ts por inteiro.
2. Leia server/src/services/auditLogService.ts, a função que faz o fetch do webhook e a rotina de dreno (waitForPendingAuditLogs).
3. Leia server/index.ts, a sequência de shutdown (forcedExit, chamada ao dreno, sequelize.close()).
4. Leia docker-compose.yml e docker-compose.prod.yml (healthcheck e ausência de stop_grace_period).

PROBLEMA 1 (BLOQUEANTE) — handler de uncaughtException não mata o processo:
processSafety.ts registra process.on('uncaughtException', ...) que só loga e seta process.exitCode = 1, sem nunca chamar process.exit() nem shutdown(). Num servidor HTTP ativo isso nunca aborta o processo sozinho — o processo continua servindo requisições com estado potencialmente corrompido, e o healthcheck continua respondendo 200. Corrija para que o handler, depois de logar, dispare a mesma rotina de shutdown() já usada no encerramento normal (ver server/index.ts), com um fallback de process.exit(1) caso o shutdown gracioso não complete num tempo curto. O processo não pode continuar vivo servindo requisições depois de uma exceção não capturada.

PROBLEMA 2 (BLOQUEANTE) — fetch do webhook de auditoria sem timeout:
Em auditLogService.ts, o fetch(webhookUrl, ...) não tem AbortSignal/timeout. Se o destino do webhook pendurar o socket, o await fica pendente indefinidamente, e o dreno de shutdown (waitForPendingAuditLogs, 10s) expira e PROSSEGUE sem esperar — perdendo o evento de auditoria silenciosamente, o fail-open exato que este caso existe para consertar. Adicione timeout ao fetch (signal: AbortSignal.timeout(N), N curto, poucos segundos) para que falha de rede no webhook não segure a promise indefinidamente. Contabilize a falha em auditFailureStats normalmente.

PROBLEMA 3 (ALTA) — orçamento de shutdown incoerente com o grace period do Docker:
server/index.ts tem forcedExit em 15s e dreno de auditoria pedindo até 10s — se server.close() levar mais de 5s, o forcedExit mata o processo antes do sequelize.close(). E nem docker-compose.yml nem docker-compose.prod.yml declaram stop_grace_period (default Docker 10s, depois SIGKILL) — o dreno nunca termina dentro do grace period real em container. Declare stop_grace_period explícito nos dois arquivos docker-compose, com margem suficiente para que a relação "stop_grace_period do Docker > forcedExit do processo > dreno de auditoria" valha de fato, com folga clara documentada. Ajuste os orçamentos internos se necessário para ficarem coerentes entre si.

Documente no REMEDIATION_EVIDENCE_PACKAGE.md do caso (seção nova "Correção 01"):
- os 3 problemas, com arquivo:linha da causa;
- a correção de cada um, com arquivo:linha;
- prova vermelha: cenário de exceção não capturada mantendo o processo vivo ANTES da correção (Problema 1); cenário de webhook lento/pendurado segurando o dreno indefinidamente ANTES da correção (Problema 2);
- prova verde: os mesmos cenários corrigidos DEPOIS;
- output REAL de: testes novos/atualizados, typecheck/build do server.

Validação depois:
- Execute os testes novos/atualizados e a suíte relevante, capture e registre o output real.
- Execute typecheck/build do server, capture e registre o output real.

Ao terminar:
- Atualize REMEDIATION_EVIDENCE_PACKAGE.md e o status do caso, mantendo REMEDIATION_COMPLETE apenas se os 3 pontos estiverem de fato corrigidos e comprovados com output real.
- Commit na branch sana/ERP-LEGACY-001/CASE-008, não em main.
- Nunca escreva FINDING CLOSED nem RETEST_PASSED.
- Pare aguardando revisão/segunda opinião/reteste da VeriCore.
```

## 7. Registro

Corrige a remediação existente do CASE-008 (AUD-DB-02), mesma worktree/
branch. Não reabre a Opção C nem o tratamento de `safeJsonStringify`, ambos
já corretos. Autoridade de `RETEST_PASSED`/`FINDING CLOSED` permanece
exclusiva da VeriCore.
</content>
</invoke>
