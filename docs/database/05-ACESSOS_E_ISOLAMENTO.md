# Acessos e Isolamento — ERP EVOK ÁUDIO

Auditoria real do ambiente local em 2026-08-06 (introspecção `pg_roles` +
varredura de código), não presunção a partir de documentação anterior.

## 1. Matriz de Privilégios — realidade encontrada

**Achado de auditoria (risco a reportar, não apenas documentar):** o
banco tem **um único usuário PostgreSQL**, `evok_admin`, que é
**superusuário** (`rolsuper = true`, `rolcreaterole = true`,
`rolcreatedb = true`). Confirmado via:

```sql
SELECT rolname, rolsuper, rolcreaterole, rolcreatedb
FROM pg_roles WHERE rolname NOT LIKE 'pg_%';
-- evok_admin | t | t | t
```

Esse mesmo usuário é usado para **tudo**: a API Node.js em runtime
(`DB_USER=evok_admin` em `docker-compose.yml`/`.env.example`), as
migrations do Sequelize, e qualquer acesso administrativo manual
(`psql`/DBeaver/pgAdmin). Não existem roles separadas por
função/aplicação nem por privilégio mínimo.

| Papel esperado (boa prática) | Existe hoje? |
|---|---|
| Role de aplicação (runtime) com apenas `SELECT/INSERT/UPDATE/DELETE` nas tabelas de negócio, sem `DDL` | ❌ Não — `evok_admin` pode fazer qualquer DDL |
| Role de migration (deploy) com privilégio de `CREATE`/`ALTER`/`DROP` | ❌ Não — mesmo usuário do runtime |
| Role somente-leitura para relatórios/BI externo | ❌ Não existe (e não deveria ser criado apontando para fora do isolamento — ver §2) |
| Role de backup (`pg_dump`) com privilégio mínimo necessário | ❌ Não — usa `evok_admin` (superuser) |

### Risco

Um comprometimento de credencial da API (`DB_PASSWORD` vazado, injeção de
SQL residual, ou compromisso do container `api`) dá ao atacante
**superusuário completo do Postgres** — capacidade de `DROP DATABASE`,
criar outras roles, ler/alterar qualquer tabela do sistema, não apenas as
tabelas de negócio do ERP. Isso viola o princípio de menor privilégio e
amplia o raio de impacto de qualquer vulnerabilidade de aplicação (SQL
injection, RCE, etc.) para o banco inteiro.

### Recomendação (não implementada nesta rodada — decisão do dono do produto)

1. Criar uma role `evok_app` (não superuser) com `GRANT` explícito de
   `SELECT, INSERT, UPDATE, DELETE` nas tabelas de negócio (não em
   `pg_catalog`/tabelas de sistema), usada pela API em runtime.
2. Manter `evok_admin` (superuser) apenas para migrations/DDL e
   administração manual, fora do `.env` da API.
3. Criar uma role `evok_backup` (`pg_read_all_data` ou equivalente
   mínimo) dedicada ao `pg_dump` do cron de backup, em vez de
   `evok_admin`.
4. Se algum dia existir necessidade de leitura para BI/relatórios
   externos, criar role somente-leitura dedicada — nunca reaproveitar
   `evok_admin`.

Isto é uma recomendação de hardening, não um bloqueador imediato de
Go-Live — mas deve entrar em `docs/governance/TODO.md` como item de
segurança pós-Go-Live (segregação de privilégios de banco).

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
| `docker-compose.prod.yml` dedicado | ❌ **Não existe ainda** no repositório (confirmado por busca de arquivo) — é um item pendente do checklist de Go-Live em `docs/infra/DEPLOY_UBUNTU.md` |
| `DB_SSL` em produção | Suportado via env var (`DB_SSL=true` + `DB_SSL_CA_PATH`/`DB_SSL_CA_BASE64`), mas **não validado de ponta a ponta** contra um servidor real ainda (mesmo checklist) |
| Rede Docker interna | API conecta via hostname `postgres` da rede do compose — não exposta fora do host |

Ver `docs/infra/DEPLOY_UBUNTU.md` seção "Checklist de prontidão" para o
estado completo dessas pendências de infraestrutura (fora do escopo
estritamente de schema/dados desta rodada, mas relacionado).
