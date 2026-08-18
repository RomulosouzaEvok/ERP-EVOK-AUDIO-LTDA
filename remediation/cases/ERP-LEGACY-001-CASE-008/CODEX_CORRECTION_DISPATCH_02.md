# Despacho de correção — CORREÇÃO 02 — `ERP-LEGACY-001-CASE-008`

```
CASE_ID:      ERP-LEGACY-001-CASE-008
FINDING_ID:   AUD-DB-02
ESCOPO:       Correção pontual: exit code do shutdown fatal mascarado como sucesso
BRANCH:       sana/ERP-LEGACY-001/CASE-008
WORKTREE:     C:\Sistema EvokAudio\ERP-Evok-sana-CASE-008
DESTINO:      sanacore-remediation-engineer / Codex
BASEADO EM:   commit 27ddbbb1166c0fa76e694c714ac2e5932e3152bf
              ("fix(case008): harden fatal shutdown and webhook timeout")
```

## 1. Contexto

A Correção 01 (commit 27ddbbb) tratou corretamente os Problemas 1-3 do
`CODEX_CORRECTION_DISPATCH_01.md`: o handler de `uncaughtException` agora
chama `fatalShutdown` de verdade, o `fetch` do webhook de auditoria tem
timeout, e os orçamentos de shutdown (`FATAL_SHUTDOWN_FORCED_EXIT_MS`,
`NORMAL_SHUTDOWN_FORCED_EXIT_MS` etc.) foram introduzidos e estão coerentes
com o `stop_grace_period`. Isso está correto e não deve ser reaberto ou
duplicado.

Nesta sessão a VeriCore encontrou um achado novo, ainda não coberto por
nenhum despacho anterior, no mesmo arquivo tocado pela Correção 01. Este
despacho corrige apenas esse ponto.

## 2. Problema (ALTA) — shutdown fatal bem-sucedido sai com exit code 0

`server/index.ts:39-86` (worktree `C:\Sistema EvokAudio\ERP-Evok-sana-CASE-008`),
função `shutdown(signal, options)`:

```ts
async function shutdown(signal: string, options: ShutdownOptions = {}): Promise<void> {
  ...
  try {
    if (server) {
      await new Promise<void>((resolve, reject) => { server?.close(...); });
    }

    const drainResult = await waitForPendingAuditLogs(drainTimeoutMs);
    ...
    await sequelize.close();
    clearTimeout(forcedExit);
    logger.info('Shutdown concluido com sucesso.');
    process.exit(0);          // <-- linha 79, incondicional
  } catch (error: unknown) {
    ...
    process.exit(1);
  }
}
```

A mesma função `shutdown()` é chamada em dois contextos com significado
operacional oposto:

- `server/index.ts:100-106` — `SIGTERM`/`SIGINT`, encerramento gracioso
  pedido de fora (deploy, orquestrador). `process.exit(0)` está correto
  aqui.
- `server/index.ts:26-32` — `registerProcessSafetyHandlers({ fatalShutdown:
  () => shutdown('uncaughtException', { forcedExitMs:
  FATAL_SHUTDOWN_FORCED_EXIT_MS, drainTimeoutMs:
  FATAL_AUDIT_DRAIN_TIMEOUT_MS }) })`. Este caminho só existe porque o
  processo teve uma `uncaughtException` — ou seja, já é, por definição, um
  crash.

O bloco `try` da linha 79 não distingue os dois casos. Se o `server.close()`,
o dreno de auditoria e o `sequelize.close()` completarem sem lançar (o
caminho normal, já que a Correção 01 deixou esse fluxo robusto), a função
**sempre** termina em `process.exit(0)` — inclusive quando `signal ===
'uncaughtException'`.

Consequência: um orquestrador de produção (Docker `restart: on-failure`,
PM2, Kubernetes com `livenessProbe`/política de restart baseada em exit
code) recebe exit code 0 — "saída limpa, não reiniciar, não alertar" — para
um processo que na verdade morreu por exceção não tratada. O log da
aplicação registra o erro corretamente (`logger.error` já roda dentro de
`processSafety.ts` antes de chamar `fatalShutdown`), mas a camada de
observabilidade operacional que decide com base em exit code fica cega para
o incidente. Isso é exatamente a classe de mascaramento que a Correção 01 já
eliminou para o caso "shutdown fatal trava" (Problema 1 original) — este é o
caso irmão "shutdown fatal completa rápido demais e sai limpo".

Nenhuma prova adicional de reprodução com processo real é necessária além da
leitura do código: o defeito é estrutural (falta de diferenciação de
origem), não dependente de timing.

## 3. Correção exigida

O exit code do shutdown deve refletir a origem, não apenas se o drain/close
tiveram sucesso:

- Quando `shutdown()` é chamado a partir do `fatalShutdown` (origem
  `uncaughtException`), o exit code de sucesso deve ser não-zero (ex.: `1`,
  ou outro valor distinto e documentado, diferente do usado no `catch` para
  não confundir "shutdown fatal completou" com "shutdown lançou exceção
  durante o processo" — decisão de qual valor cabe ao Codex, desde que seja
  não-zero e documentado).
- Quando `shutdown()` é chamado a partir de `SIGTERM`/`SIGINT` (encerramento
  gracioso pedido de fora) e completa sem erro, o exit code continua `0`.

Forma sugerida (não obrigatória, avaliar a mais simples): estender
`ShutdownOptions` com um campo explícito, por exemplo `exitCodeOnSuccess?:
number` (default `0`), e passar esse valor no `process.exit(...)` da linha
79 em vez do literal `0`. No `registerProcessSafetyHandlers({ fatalShutdown:
... })` (linha 26-32), a chamada a `shutdown('uncaughtException', { ...,
exitCodeOnSuccess: 1 })` passa a declarar explicitamente que esse é um
shutdown fatal. Não duplicar a função `shutdown()` inteira para isso — é uma
correção pontual de opção, não uma reescrita de fluxo.

Atenção: o `catch` (linha 84, `process.exit(1)`) já cobre o caso "shutdown
lançou". Não é necessário alterá-lo — a diferenciação pedida é apenas para o
caminho de sucesso (linha 79). Se o Codex preferir usar um código diferente
de `1` no sucesso fatal para não colidir semanticamente com o `catch` (ex.:
`1` para "shutdown falhou" vs. algum outro valor documentado para "shutdown
fatal, mas completou"), justificar a escolha no evidence package — mas o
requisito mínimo inegociável é: **não pode ser `0`**.

## 4. Não regredir

- Timeout do webhook de auditoria (Correção 01, Problema 2) — não tocar.
- Grace periods e a relação `stop_grace_period do Docker > forcedExit do
  processo > dreno de auditoria` (Correção 01, Problema 3) — não tocar os
  valores numéricos, exceto se a mudança pedida aqui exigir ajuste trivial
  de algum comentário/documentação associada.
- Shutdown gracioso por `SIGTERM`/`SIGINT` continua saindo com `0` quando
  bem-sucedido — este é o comportamento correto e esperado, não uma
  regressão a corrigir.
- `registerProcessSafetyHandlers` continuar chamando `fatalShutdown` de
  verdade antes de qualquer `process.exit()` direto (Correção 01, Problema
  1) — não reabrir.

## 5. Teste exigido

Simular, sem subir o servidor HTTP real nem conectar em banco real:

1. Teste unitário/isolado da função `shutdown()` (ou de uma versão
   testável/exportada dela, se necessário exportar para teste) cobrindo:
   - Chamada com `signal = 'uncaughtException'` e `exitCodeOnSuccess: 1` (ou
     equivalente), mockando `server.close`, `waitForPendingAuditLogs` e
     `sequelize.close` para resolverem com sucesso (sem lançar) — asserir
     que `process.exit` foi chamado com o código fatal (não `0`).
   - Chamada com `signal = 'SIGTERM'` (sem `exitCodeOnSuccess`, ou com valor
     default) nas mesmas condições de sucesso — asserir que `process.exit`
     foi chamado com `0` (prova de não-regressão do caminho gracioso).
   - Opcional mas recomendado: caso de exceção dentro do `try` (ex.:
     `sequelize.close()` rejeitando) continuando a sair com `1` via `catch`,
     independentemente da origem — prova de que o `catch` não foi alterado.
2. Mockar `process.exit` (não deixar o teste realmente encerrar o processo
   de teste) e `logger` conforme padrão já usado nos testes de shutdown
   existentes no repositório, se houver.
3. Capturar e registrar o output real da execução desses testes (não apenas
   alegação em texto).

## 6. Prompt literal para colar no Codex

```text
Você está atuando como sanacore-remediation-engineer dentro da estrutura CoreTriad deste repositório.

Isto é uma CORREÇÃO 02, pontual, sobre a remediação já existente e já aprovada do CASE-008 (AUD-DB-02), commit 27ddbbb1166c0fa76e694c714ac2e5932e3152bf ("fix(case008): harden fatal shutdown and webhook timeout"). NÃO reabra nem duplique o que já está correto nesse commit: o handler de uncaughtException já chama fatalShutdown de verdade, o timeout do webhook de auditoria já existe, e os orçamentos de shutdown (FATAL_SHUTDOWN_FORCED_EXIT_MS, NORMAL_SHUTDOWN_FORCED_EXIT_MS, stop_grace_period) já estão coerentes entre si. Não toque nesses pontos.

Trabalhe exclusivamente na worktree/branch já existente:
  worktree: C:\Sistema EvokAudio\ERP-Evok-sana-CASE-008
  branch:   sana/ERP-LEGACY-001/CASE-008

Regras absolutas:
- NÃO conecte em erp_evok_audio (produção). NÃO abra nenhuma conexão com banco real, nem para diagnóstico.
- Não execute suíte de teste de integração contra banco real; testes desta correção devem ser unitários, com server.close/waitForPendingAuditLogs/sequelize.close mockados.
- Não toque em audit/, coretriad/governance/, coretriad/states/, .claude/.
- Não declare FINDING CLOSED nem RETEST_PASSED.
- Capture e registre o OUTPUT REAL dos comandos executados (testes, typecheck/build), não apenas a alegação em texto.

Leitura obrigatória antes de editar:
1. Leia server/index.ts por inteiro, com atenção à função shutdown() (linhas ~39-86), à interface ShutdownOptions (linhas ~34-37), à chamada de registerProcessSafetyHandlers (linhas ~26-32) e às duas chamadas de shutdown() por SIGTERM/SIGINT (linhas ~100-106).
2. Leia server/src/config/processSafety.ts para confirmar como fatalShutdown é invocado hoje.

PROBLEMA (ALTA) — shutdown fatal bem-sucedido sai com exit code 0, mascarando o incidente:
A função shutdown(signal, options) é usada tanto para SIGTERM/SIGINT (encerramento gracioso pedido de fora) quanto para o fatalShutdown disparado por uncaughtException. Se server.close(), o dreno de auditoria e sequelize.close() completarem sem lançar, a função SEMPRE termina em process.exit(0) (linha ~79) — inclusive quando a origem foi uma exceção não tratada. Um orquestrador de produção (Docker, PM2, Kubernetes) que decide reiniciar/alertar com base no exit code do processo vê "saída limpa" para o que na verdade foi um crash — mascarando o incidente na camada de observabilidade operacional, mesmo com o erro corretamente logado pela aplicação.

CORREÇÃO EXIGIDA:
- O exit code de sucesso do shutdown deve refletir a origem: quando a chamada vier do fatalShutdown/uncaughtException, o exit code de sucesso deve ser não-zero (ex.: 1, ou outro valor distinto e documentado) mesmo que server.close/drain/sequelize.close tenham completado sem erro.
- Quando a chamada vier de SIGTERM/SIGINT e completar sem erro, o exit code de sucesso continua 0 — não regredir o caminho gracioso.
- Forma sugerida (avalie a mais simples, sem duplicar shutdown() inteira): estender ShutdownOptions com um campo, por exemplo exitCodeOnSuccess?: number (default 0), usá-lo na linha do process.exit(...) do caminho de sucesso (dentro do try, não no catch), e passar exitCodeOnSuccess: 1 (ou o valor escolhido) na chamada feita a partir de registerProcessSafetyHandlers({ fatalShutdown: () => shutdown('uncaughtException', { ..., exitCodeOnSuccess: 1 }) }).
- Não altere o catch existente (que já sai com process.exit(1) em caso de erro durante o shutdown) — a mudança é apenas no caminho de sucesso.
- Não altere os valores de forcedExitMs/drainTimeoutMs nem o stop_grace_period do docker-compose — irrelevante para este problema.

TESTE EXIGIDO:
Sem subir servidor HTTP real nem conectar em banco real, escreva/rode teste unitário que:
1. Chama shutdown('uncaughtException', { exitCodeOnSuccess: 1, ... }) com server.close, waitForPendingAuditLogs e sequelize.close mockados para resolver com sucesso — assert que process.exit foi chamado com o código fatal escolhido, não 0.
2. Chama shutdown('SIGTERM', {}) (ou com o default) nas mesmas condições de sucesso — assert que process.exit foi chamado com 0 (prova de não-regressão).
3. (Recomendado) Chama shutdown com sequelize.close rejeitando — assert que process.exit continua saindo com 1 via catch, independentemente da origem.
Mocke process.exit para não encerrar o processo de teste de verdade.

Documente no REMEDIATION_EVIDENCE_PACKAGE.md do caso (nova seção "Correção 02"):
- o problema, com arquivo:linha da causa (server/index.ts, função shutdown, linha do process.exit(0) original);
- a correção, com arquivo:linha;
- prova vermelha: cenário de uncaughtException completando com sucesso e saindo com exit code 0 ANTES da correção;
- prova verde: o mesmo cenário DEPOIS, saindo com exit code não-zero, e o cenário SIGTERM continuando a sair com 0;
- output REAL dos testes executados e do typecheck/build do server.

Validação depois:
- Execute os testes novos/atualizados e a suíte relevante, capture e registre o output real.
- Execute typecheck/build do server, capture e registre o output real.

Ao terminar:
- Atualize REMEDIATION_EVIDENCE_PACKAGE.md e o status do caso, mantendo REMEDIATION_COMPLETE apenas se o ponto estiver de fato corrigido e comprovado com output real.
- Commit na branch sana/ERP-LEGACY-001/CASE-008, não em main.
- Nunca escreva FINDING CLOSED nem RETEST_PASSED.
- Pare aguardando revisão/segunda opinião/reteste da VeriCore.
```

## 7. Registro

Correção pontual sobre a remediação já aprovada do CASE-008 (AUD-DB-02),
mesma worktree/branch, commit-base `27ddbbb`. Não reabre timeout de
webhook, grace periods nem o disparo real de `fatalShutdown` a partir de
`uncaughtException` — todos corretos desde a Correção 01. Autoridade de
`RETEST_PASSED`/`FINDING CLOSED` permanece exclusiva da VeriCore.
