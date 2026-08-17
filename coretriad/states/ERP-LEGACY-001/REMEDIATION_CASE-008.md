# `REMEDIATION_CASE` — `ERP-LEGACY-001-CASE-008` / `AUD-DB-02` (Opção C)

```
CASE_ID:       ERP-LEGACY-001-CASE-008
FINDING_ID:    AUD-DB-02 — HIGH, produção real, estrato 2
AUTORIZAÇÃO:   APR-2026-053 (Opção C sem webhook; D3 e D4)
AUDIT_COMMIT:  c1311a6f76b512fef893f7e60d934179cae3409f   (imutável — Regra 12)
EXECUTOR:      Codex, como `sanacore-remediation-engineer` (APR-2026-051)
WORKTREE:      c:\Sistema EvokAudio\ERP-Evok-sana-CASE-008   (criada, pronta)
BRANCH:        sana/ERP-LEGACY-001/CASE-008
BASE:          a3349a2
```

> **DESPACHO PREPARADO, NÃO INVOCADO.** O Codex CLI não está no `PATH` da máquina
> onde a sessão Claude Code roda. Este arquivo é o pacote a executar na sessão
> Codex do dono. **A implementação não começou.**

---

## 1. Como invocar

Sessão Codex, agente `sanacore-remediation-engineer`
(`.codex/agents/sanacore-remediation-engineer.toml`), a partir de
`c:\Sistema EvokAudio\ERP-Evok-sana-CASE-008`. O prompt da §3 é para colar
literalmente.

## 2. Leitura obrigatória do executor

| Artefato | Para quê |
|---|---|
| `remediation/cases/ERP-LEGACY-001-CASE-008/TRIAGE.md` | **inteira** — causa-raiz, as 4 opções, os 6 testes que reprovam hoje |
| `.codex/agents/sanacore-remediation-engineer.toml` | a sua carta |
| `CLAUDE.md` | as 24 regras |

## 3. O prompt

```text
Você é o `sanacore-remediation-engineer` (motor: Codex). Implemente a remediação
do ERP-LEGACY-001-CASE-008 (AUD-DB-02), ESCOPO OPÇÃO C.

BRANCH/WORKTREE: sana/ERP-LEGACY-001/CASE-008, já criada, base a3349a2.
AUDIT_COMMIT: c1311a6f76b512fef893f7e60d934179cae3409f

LEIA PRIMEIRO, INTEIRO:
  remediation/cases/ERP-LEGACY-001-CASE-008/TRIAGE.md

Ela separa PROVADO de ASSUMIDO. Respeite a separação e diga se discordar.

O QUE **NÃO** É ESTE CASO — leia antes de tudo
A trilha de auditoria ser fire-and-forget é POLÍTICA DELIBERADA, documentada em
quatro artefatos independentes: auditLogService.ts:92-98 ("nunca propaga erro
para o chamador") e :114-116 ("chame DEPOIS do t.commit(), nunca dentro, para
não segurar locks"). Você NÃO vai mudar isso.

  NÃO torne logAction transacional.
  NÃO propague erro ao chamador.
  NÃO toque nos 268 call sites.
  NÃO conecte webhook nem e-mail (decisão do dono, D4).
  NÃO construa fila durável (isso era a Opção B, não autorizada).

A decisão "qual perda o negócio prefere" (D1) segue ABERTA. A Opção C foi
escolhida justamente por ser ORTOGONAL a ela: nenhuma resposta futura do dono
a torna errada. Se você se pegar precisando de D1, saiu do escopo — PARE.

O QUE É ESTE CASO — quatro itens, e só

1. FECHAR O CAMINHO QUE MATA O PROCESSO.  auditLogService.ts:67
   `console.error(JSON.stringify(entry))` está FORA de qualquer try, e
   `persistFailureAndAlert` é AGUARDADA de dentro dos catch (:181, :201, :211).
   Payload não-serializável (referência circular, BigInt) faz a promessa
   flutuante rejeitar. Não há NENHUM handler de unhandledRejection em toda a
   árvore TS de server/ — Node 24 encerra o processo.
   Uma falha de auditoria pode derrubar a API: o oposto exato da política que o
   código diz implementar.

2. HANDLERS DE PROCESSO. Arquivo novo, registrado cedo no boot:
   `unhandledRejection` e `uncaughtException`. Rede de segurança de processo —
   hoje não existe nenhuma. Handler que engole tudo em silêncio é tão ruim
   quanto não ter: registre com contexto suficiente para diagnóstico.

3. DRENO NO SHUTDOWN.  server/index.ts:31-47
   O shutdown espera as respostas HTTP, mas NINGUÉM RASTREIA a promessa
   destacada de logAction; depois vem sequelize.close() e process.exit(0).
   Resultado medido: TODO DEPLOY tem janela em que operação JÁ COMMITADA perde
   a linha de auditoria E perde o fallback.
   Rastreie as promessas em voo e aguarde o dreno antes de fechar a conexão e
   sair. Use timeout — dreno que trava o shutdown vira incidente pior.

4. VOLUME PERSISTENTE PARA `logs/`.  docker-compose.yml
   Hoje o único volume é `app_uploads`; `/app/logs` morre no recreate —
   exatamente o evento que causa a perda do item 3. Sem isso, o dreno grava num
   arquivo que o deploy apaga.

   ARMADILHA MEDIDA, NÃO REPITA: docker-compose.prod.yml:115-120 JÁ monta volume
   em /app/logs, caminho que a imagem NÃO cria. Mountpoint nasce root, o
   processo roda não-root (Dockerfile:29-31 faz chown -R evok:evok /app, mas
   /app/logs é criado em runtime por mkdirSync). Resultado: EACCES no fallback E
   no Winston (LOG_FILE). Repetir isso troca "perde log no deploy" por "não
   grava log nenhum".
   Se fechar essa lacuna exigir o Dockerfile (criar /app/logs com dono correto
   na imagem), está AUTORIZADO para esse fim específico. Qualquer outro uso do
   Dockerfile: PARE e reporte.
   Verifique o prod compose também — se ele estiver quebrado hoje, DIGA; não o
   conserte por conta própria, é fora de escopo.

CRITÉRIO INEGOCIÁVEL — anti-critério declarado
  Estes passam ANTES e DEPOIS e portanto NÃO servem:
    - "logAction foi chamado"
    - "o arquivo de falha foi escrito"
    - "o retry aconteceu 2 vezes"
  (audit-log-failure-alerting.test.ts:78-79 já os cobre no AUDIT_COMMIT.)

  A triagem especificou seis testes que REPROVAM hoje. Deste escopo, valem:
    T-dreno    perda no shutdown
    T-silencio perda nunca silenciosa
    T3         auditoria não mata o processo — determinístico, sem banco,
               ataca diretamente o :67. É o teste mais importante do caso.
    T-volume   volume do fallback (estático, sobre o compose)
  Todo teste tem de REPROVAR o estado do AUDIT_COMMIT e passar depois.
  Para medir o estado anterior, NÃO reverta arquivo dentro da worktree —
  extraia a árvore para fora (`git archive c1311a6f | tar -x -C <tmp>/antes`).
  Um agente que reverteu in-place neste programa morreu no meio e deixou o
  patch fora da worktree. Se não conseguir provar que reprova, DIGA.

ARMADILHA DE SEGURANÇA — confirmada em três casos seguidos
  server/tests/setup.ts:5 define só NODE_ENV; DB_NAME cai no default do schema,
  que é o nome do banco de PRODUÇÃO REAL. auditLogService.ts:14 faz
  require('../models/AuditLog') -> config/database -> new Sequelize no load.
  Não abre socket, MAS QUALQUER QUERY ABRE.
  O padrão seguro já existe no repo:
    jest.mock('../../src/models/AuditLog', …)   (audit-log-failure-alerting.test.ts:6-8)
  Use-o. Não importe app.ts em teste novo.

NÚMERO CORRIGIDO PELA TRIAGEM
  São 268 call sites em 84 arquivos, não 362. E a varredura citada pelo finding
  é vazia por construção: `auditLogService.logAction(` tem 0 ocorrências — todos
  desestruturam. Você não toca nenhum deles neste escopo.

FORA DE ESCOPO
  - CASE-005 (AUD-AUTHN-01): RETEST_PASSED, FINDING NOT CLOSED, branch NÃO
    mesclada, e ela tocou docker-compose.yml e os três .env*.example. Você vai
    tocar docker-compose.yml (item 4) — MEXA SÓ na seção de volumes. Se
    precisar de outra linha do arquivo, PARE e reporte: é conflito a levantar,
    não a resolver.
  - NÃO toque em server/package.json — CASE-003, CASE-004 e CASE-006 já o
    alteram.
  - NÃO toque em runtimeEnv.ts — território do CASE-005, aberto.
  - FIND-ERP-002 (imutabilidade da trilha) está em triagem separada, CASE-009.
    Não antecipe trabalho dele.
  - CASE-004 está em RETESTE e instala chamadas de logAction. A triagem mediu
    que a Opção C é INDIFERENTE a ele. Se você descobrir que não é, PARE e
    reporte — não "ajuste" o caso alheio.

RESTRIÇÕES INVIOLÁVEIS
  - O banco de PRODUÇÃO REAL é proibido, sem exceção, nem para contar linhas
    (APR-2026-016). Use SOMENTE a credencial codex_dev (CODEX_DB_* do .env
    local), que só alcança o banco de teste. NUNCA use DB_USER/DB_PASSWORD.
  - Nunca copie valor de segredo para relatório, commit, teste ou log.
  - Você NÃO fecha finding, NÃO declara RETEST_PASSED (Regras 3 e 4). Pode
    declarar REMEDIATION_COMPLETE; o finding segue RETEST_REQUIRED.
  - NÃO escreva em audit/, coretriad/, .claude/. O git hook bloqueia, e está
    certo. NUNCA use `git commit --no-verify`.
  - Regra 6: não invente regra de negócio. Se a correção depender de regra não
    escrita em artefato versionado, PARE e pergunte.

CONSEQUÊNCIA JÁ ACEITA PELO DONO — não a "resolva"
  Sem webhook conectado, o sumidouro de falhas continua SEM CONSUMIDOR. Depois
  do seu trabalho ele será durável e drenado, mas ninguém é notificado de que
  houve falha de auditoria. Isso é decisão registrada (D4), não lacuna sua.
  Não conecte alerta. Se quiser argumentar, argumente no relatório.

RETORNO
  O que mudou (arquivo e linha); saída dos testes ANTES e DEPOIS com o número de
  casos que falham contra o AUDIT_COMMIT; como cada um dos 4 itens foi atendido;
  o que você fez sobre a armadilha do volume/EACCES; o REMEDIATION_COMMIT; e o
  que você discorda do que recebeu.
```

## 4. Depois que o Codex terminar

| # | Etapa | Quem |
|---|---|---|
| 1 | Segunda opinião / revisão | **Claude Code** (`APR-2026-051`) |
| 2 | Reteste independente | **VeriCore** |
| 3 | Veredito e fechamento | **VeriCore** — autoridade inalterada (Regra 4) |

Nenhuma declaração de `RETEST_PASSED`, `FINDING CLOSED` ou `REMEDIATION_COMPLETE`
é feita por este documento.
