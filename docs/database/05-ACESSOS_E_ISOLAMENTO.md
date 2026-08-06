# Acessos e Isolamento — ERP EVOK ÁUDIO

Auditoria real do ambiente local em 2026-08-06 (introspecção `pg_roles` +
varredura de código), não presunção a partir de documentação anterior.
**Atualizado no mesmo dia (rodada de remediação)** com a criação real da
role de privilégio mínimo `evok_app` — ver §1.1 para o que foi de fato
implementado e testado vs. o que continua sendo decisão manual do dono do
produto.

## 1. Matriz de Privilégios — realidade encontrada (achado original)

**Achado de auditoria (risco a reportar, não apenas documentar):** o
banco tinha **um único usuário PostgreSQL**, `evok_admin`, que é
**superusuário** (`rolsuper = true`, `rolcreaterole = true`,
`rolcreatedb = true`). Confirmado via:

```sql
SELECT rolname, rolsuper, rolcreaterole, rolcreatedb
FROM pg_roles WHERE rolname NOT LIKE 'pg_%';
-- evok_admin | t | t | t
```

Esse mesmo usuário era usado para **tudo**: a API Node.js em runtime
(`DB_USER=evok_admin` em `docker-compose.yml`/`.env.example`), as
migrations do Sequelize, e qualquer acesso administrativo manual
(`psql`/DBeaver/pgAdmin). Não existiam roles separadas por
função/aplicação nem por privilégio mínimo.

| Papel esperado (boa prática) | Existia em 2026-08-06 (auditoria)? | Existe agora (pós-remediação)? |
|---|---|---|
| Role de aplicação (runtime) com apenas `SELECT/INSERT/UPDATE/DELETE` nas tabelas de negócio, sem `DDL` | ❌ Não | ✅ **Sim — `evok_app`, criada e testada (§1.1)** |
| Role de migration (deploy) com privilégio de `CREATE`/`ALTER`/`DROP` | ❌ Não — mesmo usuário do runtime | 🟡 `evok_admin` continua cumprindo esse papel (não foi criada uma role de migration dedicada separada de `evok_admin` — decisão consciente, ver §1.2) |
| Role somente-leitura para relatórios/BI externo | ❌ Não existe | ❌ Continua não existindo (não é necessária hoje — ver §2) |
| Role de backup (`pg_dump`) com privilégio mínimo necessário | ❌ Não — usa `evok_admin` (superuser) | 🟡 Continua usando `evok_admin` no `pg_dump` (não bloqueante — `pg_dump` só lê; criar `evok_backup` fica como melhoria futura opcional, não crítica) |

### Risco (antes da remediação)

Um comprometimento de credencial da API (`DB_PASSWORD` vazado, injeção de
SQL residual, ou compromisso do container `api`) dava ao atacante
**superusuário completo do Postgres** — capacidade de `DROP DATABASE`,
criar outras roles, ler/alterar qualquer tabela do sistema, não apenas as
tabelas de negócio do ERP. Isso viola o princípio de menor privilégio e
amplia o raio de impacto de qualquer vulnerabilidade de aplicação (SQL
injection, RCE, etc.) para o banco inteiro.

## 1.1 Remediação implementada (2026-08-06) — role `evok_app`

**O que foi de fato feito e testado no banco local:**

1. Migration
   `server/migrations/20260806-000080-create-app-role-least-privilege.cjs`
   (aplicada via `npm run migration:up`, confirmado em
   `npm run migration:status`) cria a role `evok_app`:
   - `LOGIN`, `NOSUPERUSER`, `NOCREATEDB`, `NOCREATEROLE`,
     `NOREPLICATION`.
   - `GRANT SELECT, INSERT, UPDATE, DELETE` em todas as tabelas do schema
     `public`, **exceto** `SequelizeMeta`/`SequelizeData` (controle
     interno de migrations — a aplicação nunca precisa tocá-las).
   - `GRANT USAGE, SELECT` nas sequences do schema (necessário para
     colunas `SERIAL`/`IDENTITY` em `INSERT`).
   - `ALTER DEFAULT PRIVILEGES FOR ROLE evok_admin IN SCHEMA public` —
     tabelas/sequences **futuras**, criadas por migrations rodadas com
     `evok_admin`, herdam automaticamente o mesmo `GRANT` para
     `evok_app`, sem exigir um GRANT manual a cada migration nova.
   - Sem nenhum privilégio de DDL (`CREATE`/`ALTER`/`DROP`) em nenhum
     nível — testado explicitamente (ver item 3 abaixo).
   - `down()` reverte tudo (revoga privilégios + `DROP ROLE`),
     simétrico e testado.
2. **Senha:** lida de `APP_DB_ROLE_PASSWORD` (env var) no momento da
   migration, com fallback de desenvolvimento
   (`change-me-evok-app-dev-only`) caso a variável não esteja definida —
   documentado em `.env.example`. **Nunca comitar a senha real de
   produção** neste repositório.
3. **Testes reais executados no banco local (2026-08-06), não apenas
   teóricos:**
   ```sql
   -- confirmação de que evok_app NÃO é superuser
   SELECT rolname, rolsuper, rolcreaterole, rolcreatedb, rolcanlogin
   FROM pg_roles WHERE rolname IN ('evok_admin','evok_app');
   -- evok_admin | t | t | t | t
   -- evok_app   | f | f | f | t
   ```
   - `SELECT count(*) FROM items;` conectado como `evok_app` (via TCP,
     `psql -h 127.0.0.1 -U evok_app`, com senha) → **funciona** (13
     linhas).
   - `CREATE TABLE hack_test(id int);` conectado como `evok_app` →
     **rejeitado**: `ERROR: permission denied for schema public`.
   - `SELECT count(*) FROM "SequelizeMeta";` conectado como `evok_app` →
     **rejeitado**: `ERROR: permission denied for table SequelizeMeta`.
   - `curl http://localhost:5000/health/ready` **depois** de criar a
     role → segue `{"status":"ready","database":"up"}` (a API continuou
     rodando com `evok_admin` sem interrupção — a criação da role é
     aditiva, não afeta a credencial ativa).
   - `npm test` (a partir de `server/`) → **86 suites, 670 testes,
     passou** depois da migration aplicada.

### Decisão explícita: a troca de `.env` NÃO foi aplicada agora

**Esta rodada optou pela opção (a) do escopo pedido:** criar a role e
documentar o caminho de migração, **sem trocar `DB_USER`/`DB_PASSWORD`
no `.env` ativo deste ambiente de desenvolvimento agora**.

**Por quê:** o backend (`evok-api`) e o frontend estavam rodando durante
esta remediação, sendo usados para testes manuais pelo usuário. Trocar a
credencial ativa exige (i) editar `.env`, (ii) reiniciar o container/
processo da API, e (iii) validar que nenhuma rotina administrativa
(seeds, scripts avulsos, migrations futuras rodadas sem querer com a
credencial errada) dependia implicitamente de privilégio de superuser.
Esse é um passo de baixo risco técnico mas não-zero, melhor feito
deliberadamente (janela dedicada ou no provisionamento do servidor de
produção) do que de forma silenciosa no meio de uma sessão de trabalho
ativa.

### Como/quando trocar para `evok_app` (passo manual, quando decidido)

1. Definir uma senha forte e real (não o default de dev) para
   `APP_DB_ROLE_PASSWORD` **antes** de rodar a migration em um ambiente
   novo, ou rotacionar a senha da role já criada:
   ```sql
   ALTER ROLE evok_app WITH PASSWORD 'senha-forte-real-aqui';
   ```
2. No `.env` (ou nas variáveis de ambiente do `docker-compose.prod.yml`,
   ver `docker-compose.prod.yml` na raiz do repo):
   ```bash
   DB_USER=evok_app
   DB_PASSWORD=<senha definida no passo 1>
   ```
3. **Não trocar `DB_USER` usado pelas migrations** (`npm run
   migration:up`/`down`) — migrations continuam precisando de DDL
   (`CREATE TABLE`, `ALTER TABLE`, etc.), privilégio que `evok_app`
   deliberadamente não tem. Migrations devem sempre rodar com
   `evok_admin` (ou uma role de migration dedicada equivalente, ainda
   não criada — ver §1.2), nunca com `evok_app`.
4. Reiniciar a API (`docker compose restart api` ou `npm run server`) e
   validar `GET /health/ready` antes de considerar concluído.
5. Se algo quebrar (ex.: uma rotina descoberta que fazia DDL em runtime,
   fora de migrations), reverter `DB_USER` para `evok_admin`
   imediatamente e investigar antes de tentar de novo.

## 1.2 O que ficou como recomendação não implementada (decisão consciente)

- **Role de migration dedicada** (separada de `evok_admin`, com DDL mas
  sem ser superuser pleno): não criada nesta rodada. `evok_admin`
  continua sendo usado tanto para administração manual quanto para
  migrations. Justificativa: o ganho de segurança adicional é menor (só
  quem já tem acesso ao `.env`/repo roda migrations) comparado ao ganho
  de isolar o runtime da API (`evok_app`), que é a superfície exposta a
  requisições externas. Fica como melhoria futura opcional.
- **Role `evok_backup`** dedicada ao `pg_dump`: não criada. `pg_dump`
  hoje roda com `evok_admin` (`scripts/backup-postgres.sh`/`.ps1`), mas
  `pg_dump` é uma operação somente-leitura — o risco residual é baixo
  comparado ao runtime da API. Fica como melhoria futura opcional, não
  crítica.
- **Role somente-leitura para BI/relatórios externos:** não criada
  porque não há, hoje, nenhum consumidor de BI/relatórios externo (ver
  §2) — criar a role antecipadamente sem um consumidor real seria
  especulativo.

Isto é hardening progressivo, não um bloqueador de Go-Live — o item mais
crítico (privilégio mínimo do runtime da API) já está implementado e
testado; os itens restantes ficam registrados em
`docs/governance/TODO.md` como melhorias futuras opcionais, não como
achado de risco em aberto.

### 1.1.1 Reconfirmação real (2026-08-06) — tabelas novas do módulo COMEX herdaram os grants automaticamente

Depois da migration `20260806-000090-create-import-processes.cjs` (cria
`import_processes`/`import_process_items`, rodada com `evok_admin`),
consulta real contra `information_schema.role_table_grants` confirma que
o `ALTER DEFAULT PRIVILEGES FOR ROLE evok_admin IN SCHEMA public`
aplicado pela migration `-000080` funcionou exatamente como projetado —
**sem nenhum GRANT manual adicional**:

```sql
SELECT table_name, privilege_type FROM information_schema.role_table_grants
WHERE grantee='evok_app' AND table_name IN ('import_processes','import_process_items')
ORDER BY table_name, privilege_type;
--      table_name       | privilege_type
-- import_process_items  | DELETE
-- import_process_items  | INSERT
-- import_process_items  | SELECT
-- import_process_items  | UPDATE
-- import_processes      | DELETE
-- import_processes      | INSERT
-- import_processes      | SELECT
-- import_processes      | UPDATE
-- (8 rows)
```

`evok_app` recebeu `SELECT/INSERT/UPDATE/DELETE` nas 2 tabelas novas sem
nenhuma ação manual, exatamente como documentado em §1.1 — este é o
primeiro caso real, pós-implementação da role, de uma migration nova
criando tabelas de negócio, e serve como confirmação prática (não apenas
teórica) do mecanismo de `ALTER DEFAULT PRIVILEGES`. Nenhum privilégio de
DDL foi concedido (comportamento esperado, não testado explicitamente
nesta rodada por já estar coberto pelo teste de §1.1 item 3).

## 2. Políticas de Isolamento — serviços externos

### Regra de arquitetura (CLAUDE.md, reforçada aqui)

Nenhum serviço externo (n8n, integrações Meta/WhatsApp, provedores de
NF-e, etc.) deve ter credenciais de conexão direta (host/porta/usuário/
senha) ao PostgreSQL do ERP. Toda integração externa deve passar pela
camada HTTP da API (`server/`), autenticada e validada pela aplicação.

### Verificação real (2026-08-06)

- **n8n:** integra via `POST /api/webhooks/n8n`
  (`server/src/modules/webhooks/presentation/controllers/webhookController.ts`).
  Autenticação por **assinatura HMAC** (header `X-Evok-Signature`,
  segredo `N8N_WEBHOOK_SECRET`), validada em
  `ProcessN8nWebhookUseCase` antes de qualquer efeito no banco — **não**
  usa nenhuma credencial de banco. Sem assinatura válida, requisição é
  rejeitada (400/401) sem tocar em dados. **Confirmado: sem violação —
  n8n não tem acesso direto ao Postgres.**
- **Focus NFe / eNotas (provedores de NF-e):** notificação assíncrona via
  `POST /api/webhooks/focus-nfe`, autenticada por segredo compartilhado
  em header (`FOCUS_NFE_WEBHOOK_SECRET`), não por dado de banco. O status
  real da NF-e é sempre reconsultado na API do provedor (nunca aplicado
  cegamente do payload recebido) — mitigação adicional contra payload
  forjado. **Sem acesso a banco.**
- **Apps `mobile/`/`tv/`:** consomem a API REST autenticada por JWT
  (`Authorization: Bearer`), nunca se conectam ao Postgres diretamente.
  **Sem acesso a banco.**
- **Porta do Postgres (`5432`):** vinculada explicitamente a
  `127.0.0.1:5432` no `docker-compose.yml` (comentário no próprio
  arquivo: "acesso administrativo remoto deve usar túnel SSH, nunca
  expor `0.0.0.0:5432` publicamente"). **Confirmado: não há bind público
  do Postgres.**

### Conclusão desta seção

A política de isolamento está **corretamente implementada** na prática —
nenhum serviço externo auditado tem credencial de banco. O único achado
de risco real desta frente é o de segregação de roles dentro do próprio
Postgres (§1), não vazamento de acesso para fora.

## 3. Superfície de rede do banco

| Item | Estado |
|---|---|
| Bind da porta 5432 | `127.0.0.1:5432` apenas (dev e o `docker-compose.yml` único hoje versionado) |
| `docker-compose.prod.yml` dedicado | ✅ **Criado em 2026-08-06** (`docker-compose.prod.yml` na raiz do repo) — esqueleto validado por `docker compose -f docker-compose.prod.yml config`, mas **nunca implantado de verdade** (servidor de produção ainda não adquirido). Postgres usa `expose: ["5432"]` (sem publicar no host, nem em `127.0.0.1`); API vinculada a `127.0.0.1:5000` (reverse proxy TLS fica na frente, fora do compose). |
| `DB_SSL` em produção | Suportado via env var (`DB_SSL=true` + `DB_SSL_CA_PATH`/`DB_SSL_CA_BASE64`), default `true` no `docker-compose.prod.yml`, mas **não validado de ponta a ponta** contra um servidor real ainda (mesmo checklist) |
| Rede Docker interna | API conecta via hostname `postgres` da rede do compose — não exposta fora do host |

Ver `docs/infra/DEPLOY_UBUNTU.md` seção "Checklist de prontidão" para o
estado completo dessas pendências de infraestrutura (fora do escopo
estritamente de schema/dados desta rodada, mas relacionado).
