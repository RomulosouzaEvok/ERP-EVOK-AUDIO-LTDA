# Backup, Restore e Rollback de Migration — Gate G2 (2026-07-31)

> ## ⚠️ REGISTRO DATADO — execução do gate G2 em 2026-07-31
>
> Registro da execução real daquela sessão. Cita documentos de UAT da época
> que não existem mais no repositório.
>
> Procedimento vigente de backup/restore: `docs/infra/DEPLOY_UBUNTU.md` e
> `docs/database/07-DISASTER_RECOVERY.md`.
>
> *Banner adicionado em 2026-08-12, junto com a ampliação das guardas
> documentais (`server/tests/helpers/docsGuardConventions.ts`). O documento
> declara-se registro datado: as guardas param de auditar suas afirmações de
> estado, e o leitor é avisado antes de agir sobre elas.*

Este documento registra a execucao real, nesta sessao, dos itens `DB-10` a
`DB-13` do cronograma de correcao e go-live. Todos os comandos abaixo foram
executados de fato neste ambiente (Windows + Docker Desktop + Git Bash) e os
tempos/contagens sao os valores reais observados, sem estimativa.

## Ambiente

- Host: Windows 11 + Docker Desktop, shell Git Bash.
- Banco principal (nao alterado de forma destrutiva): container `evok-postgres`
  (Postgres 16-alpine), rede `erp-evok--audio-ltda_default`, banco
  `erp_evok_audio`, usuario `evok_admin`.
- Banco de restore isolado (criado e destruido apenas para este teste):
  container `evok-postgres-restore-test`, imagem `postgres:16-alpine`, porta
  `5433:5432`, mesmo usuario/senha de desenvolvimento (`evok_dev_password`).

## DB-10 — Script de backup e retencao

Scripts criados (logica identica, um para Windows/PowerShell, outro para
Linux/CI):

- `scripts/backup-postgres.ps1`
- `scripts/backup-postgres.sh`

O que fazem:

1. `docker exec <container> pg_dump -U <user> -d <db> -Fc -Z 9 -f /tmp/<arquivo>.dump`
   — dump em formato custom (`-Fc`), comprimido (`-Z 9`), gerado dentro do
   container em `/tmp` (nao no volume Docker de dados).
2. `docker cp <container>:/tmp/<arquivo>.dump ./backups/<arquivo>.dump` — copia
   o dump para `backups/` na raiz do repositorio, ou seja, **fora do volume
   Docker do Postgres**, em disco do host.
3. Remove o arquivo temporario de dentro do container.
4. Aplica retencao: mantem os `N` backups mais recentes (parametro
   `-Retention`/`--retention`, default `14`) do padrao
   `erp_evok_audio_*.dump` e apaga os mais antigos.

O diretorio `backups/` foi adicionado ao `.gitignore` (linha `backups/`) para
nao versionar dumps de banco.

Nota de portabilidade (Git Bash no Windows): `docker cp` com caminho absoluto
do tipo `/c/Gilwagno .../backups/arquivo.dump` falha com
`invalid output path` por causa da conversao de path do MSYS. A correcao
aplicada no script foi rodar o `docker cp` com **caminho relativo**
(`./backups/arquivo.dump`) a partir da raiz do repo, o que funciona em Git
Bash e também em Linux/CI sem alteracao. O script `.sh` tambem define
`MSYS_NO_PATHCONV=1` internamente para o `docker exec` interno funcionar sem
exigir essa variavel manualmente.

### Agendamento automatico (atualizado em 2026-07-31, segunda rodada)

Criados dois scripts de registro de agendamento, um por plataforma:

- `scripts/schedule-backup-task.ps1` — registra uma tarefa diaria no
  Agendador de Tarefas do Windows (`Register-ScheduledTask`), rodando
  `scripts/backup-postgres.ps1` no horario definido (default `03:00`) com a
  retencao desejada (default 14). Requer sessao PowerShell administrativa.
- `scripts/schedule-backup-cron.sh` — registra uma entrada no `crontab` do
  usuario atual (default `0 3 * * *`), rodando `scripts/backup-postgres.sh`
  com log redirecionado para `backups/backup-cron.log`. Idempotente: reroda
  sem duplicar a entrada (usa um marcador de comentario para substituir a
  linha anterior).

**Ambos os scripts foram validados apenas por analise de sintaxe** (parser
PowerShell e `bash -n`) nesta sessao — **nenhum foi executado de fato**,
porque isso registraria uma tarefa agendada real na maquina de
desenvolvimento local, que nao e o servidor de producao. Quando o servidor
real (VPS/on-premise) estiver definido, rodar um dos dois scripts la (o que
corresponder ao SO do servidor) e a unica acao pendente para fechar `DB-10`
por completo.

## DB-11 + DB-12 — Backup real, restore isolado e medicao de RPO/RTO

### 1. Estado de origem (antes do backup)

Contagem de linhas no banco principal `erp_evok_audio` (container
`evok-postgres`), tabelas centrais escolhidas para validacao:

```
$ docker exec evok-postgres psql -U evok_admin -d erp_evok_audio -t -c \
  "select 'users', count(*) from users
   union all select 'products', count(*) from products
   union all select 'bill_of_material_items', count(*) from bill_of_material_items;"

 users                  |     1
 products               |    16
 bill_of_material_items |     7
```

### 2. Backup real (medicao de RPO)

```
$ export MSYS_NO_PATHCONV=1
$ time bash scripts/backup-postgres.sh
Iniciando dump de 'erp_evok_audio' no container 'evok-postgres'...
Backup criado: /c/Gilwagno WorkSpace/ERP-Evok--Audio-LTDA/backups/erp_evok_audio_20260731_091218.dump (252 KB)
Backups atuais mantidos: 1 de 1 encontrados.

real    0m0.917s
```

**RPO (tempo de dump)**: `0.917s` de execucao real, para um banco de
`252 KB` (volume de dados atual do ambiente de desenvolvimento/seed). Este e o
tempo de "janela de exposicao" de um backup: com backups executados nesta
velocidade, a perda maxima de dados em caso de desastre e limitada ao
intervalo entre execucoes agendadas do script (a definir pela politica de
agendamento, ex.: cron/Task Scheduler diario ou por N horas), nao pelo tempo
de execucao do dump em si (que e sub-segundo neste volume de dados).

Arquivo de backup gerado: `backups/erp_evok_audio_20260731_091218.dump`
(258.461 bytes).

### 3. Banco isolado de restore (criado apenas para este teste)

```
$ docker run -d --name evok-postgres-restore-test \
    -e POSTGRES_DB=erp_evok_audio \
    -e POSTGRES_USER=evok_admin \
    -e POSTGRES_PASSWORD=evok_dev_password \
    -p 5433:5432 postgres:16-alpine
```

Container aguardado ate `pg_isready` responder OK (poucos segundos).

### 4. Restore real (medicao de RTO)

```
$ export MSYS_NO_PATHCONV=1
$ LATEST=$(ls -t backups/erp_evok_audio_*.dump | head -1)
$ docker cp "$LATEST" evok-postgres-restore-test:/tmp/restore.dump
$ time docker exec evok-postgres-restore-test pg_restore -U evok_admin -d erp_evok_audio -Fc /tmp/restore.dump

real    0m1.322s
```

**RTO (tempo de restore ate o schema/dados estarem gravados)**: `1.322s` de
execucao real do `pg_restore` neste volume de dados (container ja estava
saudavel e aceitando conexoes antes do restore; o tempo de subida do container
Postgres em si, ate `pg_isready` responder, levou poucos segundos adicionais
e nao esta incluido nesta medicao, que cobre apenas o `pg_restore`).

### 5. Validacao pos-restore (comparacao de contagens)

```
$ time docker exec evok-postgres-restore-test psql -U evok_admin -d erp_evok_audio -t -c \
  "select 'users', count(*) from users
   union all select 'products', count(*) from products
   union all select 'bill_of_material_items', count(*) from bill_of_material_items;"

 users                  |     1
 products               |    16
 bill_of_material_items |     7

real    0m0.214s
```

**Resultado**: contagens identicas entre origem e restaurado
(`users=1`, `products=16`, `bill_of_material_items=7`). Restore validado com
sucesso. Tempo da consulta de validacao ate o banco restaurado responder:
`0.214s` (banco ja consultavel imediatamente apos o `pg_restore`).

### 6. Encerramento do ambiente isolado

```
$ docker rm -f evok-postgres-restore-test
```

Confirmado apos remocao: apenas o container `evok-postgres` (principal)
permanece em execucao. Nenhum dado do banco principal de desenvolvimento foi
alterado ou apagado durante este teste — o container principal nao foi tocado
em nenhum momento (nem `DROP DATABASE`, nem restore, nem rollback foram
executados nele).

### 7. Recalibracao com volume representativo (2026-07-31, segunda rodada)

A medicao original acima (`0.917s`/`1.322s`) foi feita contra um banco de
`252 KB` (dados de desenvolvimento/seed) — nao representativo de um ERP em
producao apos meses de uso. Para uma estimativa mais realista, sem usar dados
reais de producao (que ainda nao existem), foi criado um **terceiro ambiente
isolado** (`evok-postgres-rpo-test`, rede `evok-rpo-net`, destruido ao final),
inflado com carga sintetica:

```
$ docker exec evok-postgres-rpo-test psql -U evok_admin -d erp_evok_audio -c "
INSERT INTO audit_logs (...)
SELECT ... FROM generate_series(1, 800000) AS g;
"
INSERT 0 800000
```

Banco resultante: `356 MB` (contra `12 MB` do banco de desenvolvimento atual e
`252 KB` da medicao original).

| Medicao | Valor real observado |
|---|---|
| RPO (tempo de `pg_dump -Fc -Z 9`, banco de 356 MB) | `2.109s` (dump comprimido resultante: `14.85 MB`) |
| RTO (tempo de `pg_restore` em container novo, ate ficar consultavel) | `5.535s` |
| Validacao pos-restore | `select count(*) from audit_logs` = `800207` (identico a origem: `800000` sinteticos + `207` pre-existentes) |

**Interpretacao**: RPO e RTO cresceram de forma sub-linear em relacao ao
tamanho do banco (356 MB / 252 KB ≈ 1400x o tamanho, mas RTO cresceu apenas
~4.2x) — esperado, pois parte do tempo de dump/restore e custo fixo de
conexao/schema, nao proporcional aos dados. Ainda assim, **estes numeros
tambem nao devem ser extrapolados diretamente para o volume real de
producao**: dados sinteticos repetitivos comprimem muito melhor que dados
reais variados (fotos, textos livres, JSON variado), e o volume real pode ser
ordens de grandeza maior. Esta recalibracao serve para confirmar que o
processo de backup/restore continua funcional e rapido (segundos, nao
minutos) numa ordem de grandeza mais realista — a medicao definitiva de
RPO/RTO para o SLA formal de producao deve ser refeita com uma copia real do
banco de producao antes do go-live definitivo.

Ambiente de teste encerrado ao final: `evok-postgres-rpo-test`,
`evok-postgres-rpo-restore` e a rede `evok-rpo-net` foram removidos; nenhum
impacto no banco principal de desenvolvimento (`evok-postgres`).

## DB-13 — Rollback de migration compativel com rollback de aplicacao

### Teste real executado (no banco de restore isolado, nao no principal)

Antes do rollback, status confirmado no restore isolado (todas as 10
migrations aplicadas, identico ao banco principal):

```
$ DB_HOST=localhost DB_PORT=5433 DB_USER=evok_admin DB_PASSWORD=evok_dev_password \
  DB_NAME=erp_evok_audio npm run migration:status
up 20260731-000001-baseline-schema.cjs
up 20260731-000002-add-expand-contract-item-columns.cjs
up 20260731-000003-align-nullable-legacy-columns.cjs
up 20260731-000004-align-supplier-optional-columns.cjs
up 20260731-000005-align-product-optional-columns.cjs
up 20260731-000006-align-bom-optional-columns.cjs
up 20260731-000007-align-purchase-optional-columns.cjs
up 20260731-000008-align-account-payable-optional-columns.cjs
up 20260731-000009-align-audit-log-optional-columns.cjs
up 20260731-000010-add-user-password-version.cjs
```

Execucao do rollback da ultima migration:

```
$ time (DB_HOST=localhost DB_PORT=5433 DB_USER=evok_admin DB_PASSWORD=evok_dev_password \
  DB_NAME=erp_evok_audio npm run migration:down)
== 20260731-000010-add-user-password-version: reverting =======
== 20260731-000010-add-user-password-version: reverted (0.015s)

real    0m0.901s
```

Status apos rollback confirma reversao sem erro:

```
up 20260731-000001-baseline-schema.cjs
...
up 20260731-000009-align-audit-log-optional-columns.cjs
down 20260731-000010-add-user-password-version.cjs
```

Sequelize CLI reverteu exatamente 1 migration (a ultima aplicada), como
esperado de `db:migrate:undo` (reverte uma migration por chamada, na ordem
inversa de aplicacao).

### Procedimento de rollback combinado (aplicacao + banco)

Para reverter um deploy de producao que incluiu N novas migrations, o
procedimento e:

1. **Reverter a imagem da aplicacao primeiro para a tag anterior** (ex.:
   `docker service update --image erp-evok-audio-server:<tag-anterior>` ou
   equivalente no orquestrador usado), garantindo que o codigo em execucao
   nao dependa mais das colunas/tabelas novas.
2. **Reverter as migrations do deploy, uma por vez, na ordem inversa** de
   aplicacao, usando o comando ja existente no projeto:

   ```
   npm run migration:down
   ```

   (a partir de `server/`, com as variaveis `DB_HOST`/`DB_PORT`/`DB_USER`/
   `DB_PASSWORD`/`DB_NAME` apontando para o banco de producao). Cada execucao
   reverte exatamente a migration mais recente ainda aplicada
   (`db:migrate:undo` do Sequelize CLI). Repetir o comando N vezes para
   desfazer as N migrations daquele deploy especifico, verificando o estado
   entre cada chamada com:

   ```
   npm run migration:status
   ```

3. **Nunca reverter migrations alem das que pertencem ao deploy sendo
   revertido** — parar assim que `migration:status` mostrar que a ultima
   migration do deploy anterior (o alvo do rollback) esta `up` e a primeira
   migration do deploy revertido esta `down`.
4. A ordem "aplicacao primeiro, banco depois" é obrigatoria porque este
   projeto segue estrategia expand-contract (migrations aditivas antes,
   remocao de compatibilidade legada depois); reverter o banco antes da
   aplicacao pode deixar a versao antiga do codigo referenciando
   colunas/tabelas que ja nao existem.

Este procedimento foi validado nesta sessao apenas quanto ao passo 2 (o
comando `migration:down` reverte sem erro e o `migration:status` reflete a
reversao corretamente), no banco de restore isolado. O passo 1 (rollback de
imagem de aplicacao via orquestrador) é parte do Gate G5/G6 (deploy/CI) e não
foi executado nesta sessão, pois nenhuma imagem de produção foi implantada.

## Resumo de evidencias

| Item | Resultado |
|---|---|
| DB-10 | Scripts `scripts/backup-postgres.ps1` e `scripts/backup-postgres.sh` criados; retencao configuravel (default 14); saida em `backups/` (fora do volume, no `.gitignore`). Scripts de agendamento (`scripts/schedule-backup-task.ps1` Windows / `scripts/schedule-backup-cron.sh` Linux) criados e com sintaxe validada; ativacao real pendente do servidor definitivo. |
| DB-11 | Backup real gerado a partir de `evok-postgres`; restaurado com sucesso em container isolado `evok-postgres-restore-test` (porta 5433); container isolado removido ao final. |
| DB-12 | Medicao inicial (banco de `252 KB`): RPO `0.917s`, RTO `1.322s`. Recalibracao com volume sintetico representativo (banco de `356 MB`, 800k registros): RPO `2.109s`, RTO `5.535s`, validado por contagem identica (`800207`). Ambos ainda nao substituem medicao final com copia real de producao antes do go-live. |
| DB-13 | `migration:down` testado no restore isolado: reverteu a migration `20260731-000010-add-user-password-version` em `0.015s` (execucao total do comando `0.901s`), confirmado via `migration:status`. Procedimento combinado de rollback documentado acima. |

## Riscos residuais

- A medicao original (banco de `252 KB`) foi recalibrada com um volume
  sintetico de `356 MB`/800k registros (RPO `2.109s`, RTO `5.535s` — ver
  secao "Recalibracao com volume representativo" acima). Ainda assim, dados
  sinteticos repetitivos comprimem melhor que dados reais e o volume real de
  producao pode ser maior; **a medicao definitiva de SLA de RPO/RTO deve ser
  refeita com uma copia real do banco de producao** antes do go-live
  definitivo.
- O agendamento automatico (`scripts/schedule-backup-task.ps1`/`schedule-backup-cron.sh`)
  foi criado e tem sintaxe validada, mas **nao foi ativado de fato** — rodar
  qualquer um dos dois registraria uma tarefa real na maquina onde ele
  executa, e a maquina de desenvolvimento local nao e o servidor de
  producao. Falta apenas rodar o script correspondente no servidor real
  quando ele existir. Armazenamento externo redundante (fora do proprio
  servidor) e alertas de falha de backup continuam fora do escopo desta
  sessão (infraestrutura de operação, Gate G5).
- O passo de reverter a imagem da aplicação (rollback) **foi testado** em
  ensaio de canario local em 2026-07-31 (parar o container candidato e subir
  a tag anterior aprovada contra o mesmo banco) — a descrição acima é o
  próprio registro desse ensaio; a citação original a
  `docs/UAT_RELEASE_G6_2026-07-31.md` **referencia um arquivo que nunca
  existiu no repositório** (achado no pente-fino estrutural de 2026-08-06,
  `docs/governance/TODO.md`) — não foi possível confirmar se o relato
  detalhado desse ensaio chegou a virar um documento próprio ou se ficou
  apenas nesta nota. Para o status vigente de Gate G6 (incluindo
  rollback/canário contra o servidor real, ainda pendente), ver
  `docs/governance/go-live/GO_LIVE_G6_CHECKLIST.md`. O que falta é repetir esse mesmo teste
  contra o orquestrador de deploy do servidor real, ainda nao definido.
