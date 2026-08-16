# G4 — Credencial de Auditoria Isolada (barreira técnica, não apenas instrução)

- **Auditoria:** ERP-LEGACY-001-AUD-001
- **Gate:** G4 (reforço de precondição para prova dinâmica)
- **Executor:** infraestrutura de containers/roles (função OpusCore de infraestrutura —
  não produto, não schema, não achado, não veredito de auditoria)
- **Autorização:** decisão explícita do dono nesta sessão (Regra 18 CLAUDE.md), citada
  verbatim no prompt da tarefa: *"Reforce tecnicamente: crie uma credencial de banco
  isolada para a auditoria, sem NENHUMA visibilidade ou permissão sobre o banco de
  produção real — para que esse tipo de engano se torne tecnicamente impossível, não
  apenas proibido por instrução."*
- **Motivo de fato:** incidente auto-reportado em `G4_PRECONDICAO_BANCO_TESTE.md` §
  "Incidente auto-reportado" — um agente anterior rodou `SELECT count(*) ... -d
  erp_evok_audio` (leitura, sem escrita) contra produção real usando `evok_admin`, que
  enxerga os dois bancos.
- **Data/hora de execução:** 2026-08-16
- **Branch de referência:** `main`, HEAD local no momento da execução (mesma condição
  registrada em `G4_PRECONDICAO_BANCO_TESTE.md`)
- **Escopo cumprido:** apenas privilégios de role a nível de cluster PostgreSQL. Nenhum
  comando alterou dado, schema, tabela, índice ou qualquer objeto **dentro** de
  `erp_evok_audio` ou `erp_evok_audio_test`. Nenhuma migration foi criada. Nenhum
  arquivo em `server/src`, `client/src` ou `tests/` foi alterado.

## 0. Confirmação de alvo antes de operar

Antes de qualquer comando, confirmado explicitamente contra qual host/porta/role a
sessão administrativa operava:

```
$ docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"
NAMES           IMAGE                         STATUS
evok-api        erp-evok-audio-server:local   Up (healthy)
evok-postgres   postgres:16-alpine            Up (healthy)
```

Todos os comandos administrativos abaixo foram executados via
`docker exec ... evok-postgres psql -U evok_admin -d postgres` (banco de manutenção
`postgres`, nunca `erp_evok_audio`) para os passos de `CREATE ROLE`/`GRANT`/`REVOKE` —
esses comandos atuam sobre metadados de cluster (`pg_database`, `pg_roles`,
`pg_auth_members`), não sobre o conteúdo de nenhum banco de aplicação.

## 1. Estado ANTES (evidência de partida)

### 1.1 Roles existentes no cluster

```
$ docker exec evok-postgres psql -U evok_admin -d postgres -c "\du"
                              List of roles
 Role name  |                         Attributes
------------+------------------------------------------------------------
 evok_admin | Superuser, Create role, Create DB, Replication, Bypass RLS
 evok_app   |
```

Apenas duas roles: `evok_admin` (superuser, dono de tudo) e `evok_app` (sem atributos
especiais — role já usada para conceder acesso de aplicação, atualmente não referenciada
pelo `docker-compose.yml`/`.env` como `DB_USER`, que hoje aponta para `evok_admin`;
isso é observação de infraestrutura, não um achado — não avalio se isso deveria mudar).

### 1.2 Bancos existentes e privilégios (ACL) por banco

```
$ docker exec evok-postgres psql -U evok_admin -d postgres -c "\l"
        Name         |   Owner    | ... | Access privileges
---------------------+------------+-----+---------------------------
 erp_evok_audio      | evok_admin | ... | =Tc/evok_admin           +
                      |            |     | evok_admin=CTc/evok_admin+
                      |            |     | evok_app=c/evok_admin
 erp_evok_audio_test  | evok_admin | ... | =Tc/evok_admin           +
                      |            |     | evok_admin=CTc/evok_admin+
                      |            |     | evok_app=c/evok_admin
 postgres             | evok_admin | ... | (padrão)
 template0            | evok_admin | ... | (padrão)
 template1            | evok_admin | ... | (padrão)
```

Ponto crítico já visível aqui, ANTES de qualquer mudança: a entrada `=Tc/evok_admin`
em `erp_evok_audio` é a ACL implícita de `PUBLIC` — a role vazia antes do `=` é `PUBLIC`.
`c` = `CONNECT`, `T` = `TEMP`. Ou seja, **qualquer role com `LOGIN`, mesmo sem nenhum
`GRANT` explícito, já conseguia conectar em `erp_evok_audio` (produção) por causa do
privilégio padrão de `PUBLIC`.** Isso confirma, por medição e não por suposição, que
"revogar CONNECT só da role nova" não seria suficiente — é necessário tratar `PUBLIC`
explicitamente (feito na Seção 2).

### 1.3 Roles e atributos completos (confirmação sem colisão de nome)

```
$ docker exec evok-postgres psql -U evok_admin -d postgres -c "\du+"
 Role name  |                         Attributes                         | Description
------------+------------------------------------------------------------+-------------
 evok_admin | Superuser, Create role, Create DB, Replication, Bypass RLS |
 evok_app   |                                                            |
```

`evok_audit` não existe ainda — sem colisão de nome, pode ser criada.

## 2. Comandos executados (verbatim)

Todos executados contra o banco de manutenção `postgres`, como `evok_admin`, via
`docker exec -i evok-postgres psql -U evok_admin -d postgres -v ON_ERROR_STOP=1`.
A senha foi gerada localmente com `openssl rand -base64 24 | tr -d '=+/\n' | cut -c1-32`
e interpolada apenas dentro do heredoc do próprio comando (nunca impressa em stdout,
nunca gravada em arquivo versionado — ver Seção 5).

```sql
CREATE ROLE evok_audit WITH
  LOGIN
  PASSWORD '<gerada, ver .env local>'
  NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE
  NOBYPASSRLS
  NOREPLICATION
  CONNECTION LIMIT 5;

REVOKE CONNECT ON DATABASE erp_evok_audio FROM PUBLIC;
REVOKE ALL PRIVILEGES ON DATABASE erp_evok_audio FROM evok_audit;

GRANT CONNECT ON DATABASE erp_evok_audio_test TO evok_audit;
GRANT pg_read_all_data TO evok_audit;
```

Saída literal:

```
CREATE ROLE
REVOKE
REVOKE
GRANT
GRANT ROLE
```

Nenhum destes comandos referencia uma tabela, coluna, índice ou qualquer objeto
`DENTRO` de `erp_evok_audio` ou `erp_evok_audio_test` — todos operam sobre o catálogo
global do cluster (`pg_database`, `pg_roles`) e sobre uma role predefinida do próprio
PostgreSQL (`pg_read_all_data`, existente desde o PG14, não criada por mim).

### 2.1 Por que `REVOKE CONNECT ... FROM PUBLIC` e não só `FROM evok_audit`

Como evidenciado na Seção 1.2, `PUBLIC` tinha `CONNECT` concedido por padrão em
`erp_evok_audio` (comportamento padrão do PostgreSQL para bancos novos). Revogar
`CONNECT` apenas da role `evok_audit` seria inócuo, porque ela herdaria `CONNECT` de
`PUBLIC` de qualquer forma. O `REVOKE ... FROM PUBLIC` remove o privilégio da base
compartilhada; o `REVOKE ... FROM evok_audit` logo depois é redundante/defensivo
(não havia grant explícito a essa role ainda) mas foi mantido por princípio de
"negação explícita documentada", não por necessidade técnica.

**Efeito colateral avaliado e considerado aceitável:** `evok_app` mantém `CONNECT` em
`erp_evok_audio` porque tem um `GRANT` explícito próprio (`evok_app=c/evok_admin`,
visível na Seção 1.2 e reconfirmado na Seção 3), que não depende de `PUBLIC`.
`evok_admin`, por ser `SUPERUSER`, ignora restrições de `CONNECT`. Ou seja, a
revogação de `PUBLIC` não quebra a API (`evok_app`/`evok_admin`) — só fecha a porta
que estava aberta por padrão para qualquer role futura com `LOGIN`.

## 3. Estado DEPOIS (evidência de chegada)

```
$ docker exec evok-postgres psql -U evok_admin -d postgres -c "\du"
                              List of roles
 Role name  |                         Attributes
------------+------------------------------------------------------------
 evok_admin | Superuser, Create role, Create DB, Replication, Bypass RLS
 evok_app   |
 evok_audit | 5 connections
```

```
$ docker exec evok-postgres psql -U evok_admin -d postgres -c \
  "SELECT datname, datacl FROM pg_database WHERE datname IN ('erp_evok_audio','erp_evok_audio_test');"
       datname       |                                          datacl
---------------------+--------------------------------------------------------------------------------------------
 erp_evok_audio       | {=T/evok_admin,evok_admin=CTc/evok_admin,evok_app=c/evok_admin}
 erp_evok_audio_test  | {=Tc/evok_admin,evok_admin=CTc/evok_admin,evok_app=c/evok_admin,evok_audit=c/evok_admin}
```

Leitura da ACL de `erp_evok_audio` **depois**: `=T/evok_admin` — `PUBLIC` ficou só com
`TEMP`, o `c` (CONNECT) sumiu da entrada de `PUBLIC`. `evok_audit` **não aparece em
nenhuma posição da ACL de `erp_evok_audio`** — zero privilégio, nem por herança de
`PUBLIC`, nem por grant direto. Em `erp_evok_audio_test`, `evok_audit=c/evok_admin`
confirma o `CONNECT` concedido.

```
$ docker exec evok-postgres psql -U evok_admin -d postgres -c \
  "SELECT r.rolname AS member, g.rolname AS granted_role FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.member JOIN pg_roles g ON g.oid=m.roleid WHERE r.rolname='evok_audit';"
   member   |   granted_role
------------+------------------
 evok_audit | pg_read_all_data
```

```
$ docker exec evok-postgres psql -U evok_admin -d postgres -c \
  "SELECT rolname, rolsuper, rolcreatedb, rolcreaterole, rolbypassrls, rolreplication, rolcanlogin, rolconnlimit FROM pg_roles WHERE rolname='evok_audit';"
  rolname   | rolsuper | rolcreatedb | rolcreaterole | rolbypassrls | rolreplication | rolcanlogin | rolconnlimit
------------+----------+-------------+---------------+--------------+----------------+-------------+--------------
 evok_audit | f        | f           | f             | f            | f              | t           |            5
```

Confirmado: sem `SUPERUSER`, sem `CREATEDB`, sem `CREATEROLE`, sem `BYPASSRLS`, sem
`REPLICATION`. Apenas `LOGIN` (necessário para conectar) e limite de 5 conexões
simultâneas (defensivo, evita que um agente com bug abra conexões sem limite).

Sanidade final dos containers (nada foi reiniciado, mudança de role é aplicada em
tempo real pelo PostgreSQL, sem downtime):

```
$ docker ps --format "table {{.Names}}\t{{.Status}}"
NAMES           STATUS
evok-api        Up (healthy)
evok-postgres   Up (healthy)
```

## 4. Prova de execução (passos 3 e 4 do pedido) — saída literal

### 4.1 Tentativa de conectar como `evok_audit` em `erp_evok_audio` (produção) — DEVE FALHAR

```
$ docker exec -e PGPASSWORD=*** evok-postgres psql -U evok_audit -h 127.0.0.1 -d erp_evok_audio -c "SELECT 1;"
psql: error: connection to server at "127.0.0.1", port 5432 failed: FATAL:  permission denied for database "erp_evok_audio"
DETAIL:  User does not have CONNECT privilege.
EXIT_CODE=2
```

### 4.2 Tentativa de `SELECT` de catálogo em `erp_evok_audio` — DEVE FALHAR (a conexão nem se estabelece)

```
$ docker exec -e PGPASSWORD=*** evok-postgres psql -U evok_audit -h 127.0.0.1 -d erp_evok_audio -c "SELECT count(*) FROM pg_stat_activity;"
psql: error: connection to server at "127.0.0.1", port 5432 failed: FATAL:  permission denied for database "erp_evok_audio"
DETAIL:  User does not have CONNECT privilege.
EXIT_CODE=2
```

A recusa acontece na fase de autenticação/estabelecimento de conexão (`FATAL`), antes
de qualquer parsing de SQL — ou seja, não é uma checagem de permissão por comando, é
uma barreira de handshake. Não há como `evok_audit` executar absolutamente nenhum
comando contra `erp_evok_audio`, nem `SELECT 1`.

### 4.3 Confirmação de que a role continua funcional em `erp_evok_audio_test`

```
$ docker exec -e PGPASSWORD=*** evok-postgres psql -U evok_audit -h 127.0.0.1 -d erp_evok_audio_test -c "SELECT current_user, current_database();"
 current_user |  current_database
--------------+---------------------
 evok_audit   | erp_evok_audio_test
EXIT_CODE=0

$ docker exec -e PGPASSWORD=*** evok-postgres psql -U evok_audit -h 127.0.0.1 -d erp_evok_audio_test -c "SELECT count(*) AS total_tabelas FROM information_schema.tables WHERE table_schema='public';"
 total_tabelas
---------------
           207
EXIT_CODE=0

$ docker exec -e PGPASSWORD=*** evok-postgres psql -U evok_audit -h 127.0.0.1 -d erp_evok_audio_test -c "SELECT count(*) FROM \"SequelizeMeta\";"
 count
-------
   169
EXIT_CODE=0
```

`207` tabelas e `169` migrations em `SequelizeMeta` batem exatamente com os números
medidos em `G4_PRECONDICAO_BANCO_TESTE.md` (banco de teste recriado limpo,
não-contaminado) — confirma que `evok_audit` lê o mesmo banco que serve de base de
prova dinâmica, com dados reais de teste, não um banco vazio ou diferente.

### 4.4 Confirmação de privilégio mínimo: tentativa de escrita — DEVE FALHAR

```
$ docker exec -e PGPASSWORD=*** evok-postgres psql -U evok_audit -h 127.0.0.1 -d erp_evok_audio_test -c "CREATE TABLE evok_audit_probe(x int);"
ERROR:  permission denied for schema public
LINE 1: CREATE TABLE evok_audit_probe(x int);
                     ^
EXIT_CODE=1
```

Nenhum objeto foi criado (comando falhou antes de qualquer efeito). Prova que
`evok_audit` não tem `CREATE`/`INSERT`/`UPDATE`/`DELETE` em `erp_evok_audio_test` —
só leitura, via `pg_read_all_data`.

## 5. Decisão de privilégio mínimo: só leitura, sem escrita — justificativa

`evok_audit` recebeu **apenas** `SELECT` (via `pg_read_all_data`, role predefinida do
PostgreSQL desde a versão 14) sobre `erp_evok_audio_test`, sem `INSERT`/`UPDATE`/
`DELETE`/`CREATE`/`TRUNCATE`. Justificativa:

- O propósito declarado da credencial é servir de base de **prova dinâmica de
  verificação** (VeriCore audita e reatesta — Regra 2 do CLAUDE.md — nunca corrige o
  objeto auditado). Escrita não é necessária para essa função e seria uma
  contradição direta com a regra de que VeriCore nunca altera o alvo que audita.
- `pg_read_all_data` é dinâmica: cobre automaticamente tabelas criadas por migrations
  futuras em `erp_evok_audio_test`, sem exigir um novo `GRANT` manual toda vez que
  `AdmDBA` adicionar uma tabela — evita que a credencial de auditoria "quebre" ou
  fique defasada a cada mudança de schema, sem abrir mão do princípio de privilégio
  mínimo (continua sendo só leitura).
- Se, no futuro, algum fluxo de prova dinâmica precisar popular dados de teste
  (`INSERT`/`UPDATE` controlado em `erp_evok_audio_test`), isso deve ser um `GRANT`
  adicional explícito, decidido e registrado separadamente — não assumi essa
  necessidade aqui, e não é decisão minha ampliar escopo de escrita.

## 6. Onde configurar a credencial e o que muda no fluxo atual

A credencial foi gravada **apenas** em `.env` (raiz do repositório), que já está
listado em `.gitignore` (linha `.env`, confirmada antes da escrita — comando
`git check-ignore` implícito na leitura do `.gitignore`, que lista `.env` explicitamente
na segunda linha). **A senha em si não está, e não deve estar, em nenhum lugar deste
relatório nem em nenhum outro arquivo versionado.**

Variáveis adicionadas ao final de `.env` (valores reais só no arquivo local,
não aqui):

```
AUDIT_DB_HOST=localhost
AUDIT_DB_PORT=5432
AUDIT_DB_NAME=erp_evok_audio_test
AUDIT_DB_USER=evok_audit
AUDIT_DB_PASSWORD=<gerada, 32 caracteres, só no .env local>
```

### O que precisa mudar no fluxo dos próximos agentes de verificação dinâmica

O incidente que motivou esta tarefa aconteceu porque o agente usou
`docker exec evok-postgres psql -U evok_admin -d erp_evok_audio ...` — a credencial
`evok_admin` enxerga (e tem superuser sobre) os dois bancos, então um erro de digitação
no nome do banco (`erp_evok_audio` em vez de `erp_evok_audio_test`) não é barrado por
nada além da atenção do agente.

**A partir de agora**, qualquer agente de VeriCore que precise rodar consultas de
verificação dinâmica contra o banco de teste deve:

1. Ler `AUDIT_DB_USER`/`AUDIT_DB_PASSWORD`/`AUDIT_DB_NAME` do `.env` local (nunca
   `DB_USER`/`DB_PASSWORD`, que continuam sendo `evok_admin`/produção-e-teste).
2. Conectar como:
   `docker exec -e PGPASSWORD="$AUDIT_DB_PASSWORD" evok-postgres psql -U evok_audit -h 127.0.0.1 -d erp_evok_audio_test -c "..."`
   em vez de `-U evok_admin`.
3. Se digitar `-d erp_evok_audio` (produção) por engano, a conexão **falha
   imediatamente** com `FATAL: permission denied for database` — o erro de digitação
   vira um erro visível e bloqueante, não uma leitura silenciosa bem-sucedida contra
   produção.

Isso não exige nenhuma mudança em `docker-compose.yml`, `server/src`, `client/src` ou
`tests/` — é só uma convenção de qual credencial usar em comandos ad-hoc de auditoria,
documentada aqui e nas variáveis `AUDIT_DB_*` do `.env`.

## 7. O que esta barreira NÃO cobre (limite declarado, honestamente)

- **Não impede um agente que use `evok_admin` diretamente.** `evok_admin` continua
  superuser e continua enxergando (e podendo escrever em) ambos os bancos. A barreira
  só existe *se* o agente usar `evok_audit`. Se um agente repetir o erro anterior e
  digitar `-U evok_admin -d erp_evok_audio`, nada nesta mudança o impede — a única
  proteção ali continua sendo a instrução/atenção, exatamente o modo de falha que
  motivou esta tarefa.
- **Não impede escrita em produção por `evok_admin` ou `evok_app`** — nenhuma role
  existente teve privilégio removido além de `PUBLIC` perder `CONNECT` em
  `erp_evok_audio`. `evok_app` mantém `CONNECT` explícito em ambos os bancos
  (inalterado por esta tarefa); não investiguei nem alterei o que `evok_app` pode
  fazer além de `CONNECT`, porque isso seria mexer em privilégios usados pela API,
  fora do escopo desta tarefa.
- **Não é um bloqueio de rede.** `erp_evok_audio` e `erp_evok_audio_test` estão no
  mesmo container/porta (`5432`, único bind `127.0.0.1:5432`, ver
  `docker-compose.yml`). Não há isolamento de rede entre os dois bancos — o isolamento
  é inteiramente por privilégio de role dentro do mesmo cluster PostgreSQL. Um agente
  com a senha de `evok_admin` (hoje em `.env`, `DB_PASSWORD`) sempre poderá alcançar os
  dois bancos.
- **Para fechar essa lacuna de verdade** (impedir que a *ferramenta* de um agente de
  auditoria consiga sequer formar um comando com `evok_admin`), as opções que
  identifico — sem decidir nenhuma delas, é decisão do dono — seriam:
  1. Um hook de permissão (Regra 23 do CLAUDE.md: "Permissões são impostas por hooks
     e settings do Claude Code — o prompt é reforço, nunca o único mecanismo") que
     bloqueie, para agentes com perfil VeriCore/verificação-dinâmica, qualquer comando
     `docker exec ... -U evok_admin` ou qualquer string contendo `-d erp_evok_audio`
     sem sufixo `_test`.
  2. Um wrapper/script único (`scripts/audit-db-connect.sh` ou similar) que os agentes
     de verificação dinâmica são instruídos a usar exclusivamente, que já embute
     `-U evok_audit -d erp_evok_audio_test` e não aceita override de banco — reduz a
     superfície de erro de digitação a zero, mas ainda depende do agente usar o
     wrapper em vez de `docker exec` cru.
  3. Rodar um segundo cluster PostgreSQL (container separado) só para
     `erp_evok_audio_test`, sem a rede/volume do banco de produção — isolamento físico
     completo, mas maior custo operacional (dois Postgres, duas configurações de
     backup, duas portas) e provavelmente desproporcional para o problema real (erro
     humano/de agente, não uma ameaça de rede).

Nenhuma dessas três opções foi implementada — são levantadas aqui como próximo passo
possível, não como decisão. Não declaro achado, severidade nem status de auditoria
sobre este ponto: registro apenas a limitação técnica factual da mudança feita.

## 8. Resumo objetivo

- Role `evok_audit` criada: `LOGIN`, sem `SUPERUSER`/`CREATEDB`/`CREATEROLE`/
  `BYPASSRLS`/`REPLICATION`, limite de 5 conexões.
- `CONNECT` revogado de `PUBLIC` em `erp_evok_audio` (produção) — tratando
  explicitamente o privilégio padrão que `PUBLIC` recebe em bancos novos do
  PostgreSQL, não só a role nova.
- `evok_audit` sem nenhum privilégio em `erp_evok_audio` (nem por `PUBLIC`, nem por
  grant direto) — confirmado pela ACL (`\l`) e por tentativa real de conexão, que
  falhou com `FATAL: permission denied for database "erp_evok_audio"`.
- `evok_audit` com `CONNECT` + `SELECT` (via `pg_read_all_data`) em
  `erp_evok_audio_test` — confirmado por conexão bem-sucedida, leitura de catálogo
  (207 tabelas) e leitura de dados reais (169 linhas em `SequelizeMeta`), com
  tentativa de escrita (`CREATE TABLE`) recusada.
- Credencial gravada só em `.env` local (gitignored), nunca neste relatório nem em
  nenhum arquivo versionado.
- Nenhum comando alterou dado, schema ou objeto interno de `erp_evok_audio` ou
  `erp_evok_audio_test`. Nenhuma migration criada. Nenhum código de produto alterado.
- Limite declarado: esta barreira não impede uso de `evok_admin` — só impede que
  `evok_audit`, se usado, alcance produção. Fechar a lacuna de "agente usa a
  credencial errada por engano" é decisão do dono (Seção 7).

## 9. Pendência para o dono / VeriCore

- Decidir se alguma das 3 opções da Seção 7 deve ser implementada para fechar a
  lacuna residual (uso de `evok_admin` continua possível).
- Avaliar se `evok_app` (hoje sem uso ativo pela API, que usa `evok_admin` via
  `DB_USER` em `docker-compose.yml`/`.env`) deveria ser adotada como credencial de
  runtime da API no lugar de `evok_admin`, por simetria de privilégio mínimo — não é
  o escopo desta tarefa, só registro a observação feita durante o levantamento da
  Seção 1.
- Nenhuma decisão de achado, severidade ou status de auditoria é tomada por mim
  aqui — isso é atribuição de VeriCore.
