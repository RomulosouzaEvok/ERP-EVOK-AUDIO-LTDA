# Backup, Restore e Rollback de Migration — Gate G2 (2026-07-31)

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
Bash e também em Linux/CI sem alteracao.

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
| DB-10 | Scripts `scripts/backup-postgres.ps1` e `scripts/backup-postgres.sh` criados; retencao configuravel (default 14); saida em `backups/` (fora do volume, no `.gitignore`). |
| DB-11 | Backup real gerado a partir de `evok-postgres`; restaurado com sucesso em container isolado `evok-postgres-restore-test` (porta 5433); container isolado removido ao final. |
| DB-12 | RPO (tempo de dump): `0.917s`. RTO (tempo de `pg_restore`): `1.322s`. Validacao de consulta pos-restore: `0.214s`. Banco: `252 KB` / `258.461 bytes` de dump. |
| DB-13 | `migration:down` testado no restore isolado: reverteu a migration `20260731-000010-add-user-password-version` em `0.015s` (execucao total do comando `0.901s`), confirmado via `migration:status`. Procedimento combinado de rollback documentado acima. |

## Riscos residuais

- O volume de dados atual (ambiente de desenvolvimento/seed, `252 KB`) e
  muito menor que um banco de producao real; os tempos de RPO/RTO medidos
  aqui **nao devem ser extrapolados linearmente** para o volume de producao
  — recomenda-se repetir esta mesma medicao com uma copia representativa do
  volume de dados de producao antes do go-live, para calibrar SLA real de
  RPO/RTO.
- Nao existe ainda agendamento automatico (cron/Task Scheduler/CI job) para
  rodar `scripts/backup-postgres.ps1`/`.sh` periodicamente; o script existe e
  foi validado manualmente, mas o agendamento em si (frequencia, armazenamento
  externo redundante, alertas de falha) fica fora do escopo desta sessão e
  deve ser tratado como item de infraestrutura de operação (Gate G5).
- O passo 1 do procedimento de rollback (reverter a imagem da aplicação) não
  foi testado nesta sessão porque depende do orquestrador de deploy definido
  em G5, ainda não implementado.
