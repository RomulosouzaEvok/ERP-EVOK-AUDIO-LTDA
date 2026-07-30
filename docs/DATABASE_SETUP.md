# Configuração de Banco de Dados — ERP EVOK AUDIO

**Data**: 2026-07-30  
**Responsável**: Backend Engineer (Gilwagno)  
**Status**: ✅ Configuração padrão definida

---

## Resumo Executivo

O projeto usa **PostgreSQL 16** como banco de dados canônico. A configuração foi unificada em um arquivo `.env` que pode ser replicado entre ambientes (local, staging, produção).

### Credenciais Padrão (Desenvolvimento Local)

```
Host:     localhost
Porta:    5432
Banco:    erp_evok_audio
Usuário:  evok_admin
Senha:    evok_local_dev
SSL:      Não (false)
```

### Arquivos de Configuração

- **`.env`** — Variáveis de ambiente (criado a partir de `.env.example`)
- **`server/database/postgresql/01_schema.sql`** — Schema canônico (tabelas, tipos, índices)
- **`server/database/postgresql/02a_extend_item_estruturas.sql`** — Extensão Fase 2A (item_estruturas + migração)
- **`docker-compose.yml`** — Orchestração Docker Postgres (dev local)

---

## Fluxo de Setup

### Opção 1: Desenvolvimento Local (Docker)

Já configurado nesta máquina. Para replicar em outra:

```bash
# 1. Clonar repo
git clone https://github.com/gilwagno/ERP-Evok--Audio-LTDA.git
cd ERP-Evok--Audio-LTDA

# 2. Copiar .env
cp server/.env.example server/.env

# 3. Editar .env (se necessário, valores já vêm preenchidos para Docker local)
# DB_HOST=localhost, DB_PASSWORD=evok_local_dev

# 4. Subir PostgreSQL via Docker
docker compose up -d

# 5. Aplicar schema canônico
psql -h localhost -U evok_admin -d erp_evok_audio -f server/database/postgresql/01_schema.sql

# 6. Aplicar extensão Fase 2A
psql -h localhost -U evok_admin -d erp_evok_audio -f server/database/postgresql/02a_extend_item_estruturas.sql

# 7. Instalar dependências Node
cd server
npm install

# 8. Compilar TypeScript
npm run build

# 9. (Opcional) Seed de dados de teste
# npm run seed  (em desenvolvimento futura)
```

### Opção 2: Banco Remoto (Hostinger / Servidor Próprio)

Para usar um PostgreSQL em servidor remoto (ex. Hostinger):

```bash
# 1. Editar server/.env com credenciais remotas:
DB_HOST=seu-servidor.hostinger.com  (ou IP)
DB_PORT=5432  (ou porta diferente se configurada)
DB_NAME=erp_evok_audio
DB_USER=evok_admin  (ou usuário do servidor remoto)
DB_PASSWORD=sua-senha-segura  (NUNCA versionar, só no .env local)
DB_SSL=true  (recomendado para servidor remoto)

# 2. Aplicar schemas via psql remoto
psql -h seu-servidor.hostinger.com -U evok_admin -d erp_evok_audio -f server/database/postgresql/01_schema.sql

# 3. Aplicar extensão
psql -h seu-servidor.hostinger.com -U evok_admin -d erp_evok_audio -f server/database/postgresql/02a_extend_item_estruturas.sql

# 4. Resto igual à Opção 1 (npm install, build, etc)
```

---

## Variáveis de Ambiente Essenciais

| Variável | Descrição | Exemplo Local | Exemplo Remoto |
|----------|-----------|---|---|
| `DB_HOST` | Servidor PostgreSQL | `localhost` | `erp.hostinger.com` |
| `DB_PORT` | Porta PostgreSQL | `5432` | `5432` |
| `DB_NAME` | Nome do banco | `erp_evok_audio` | `erp_evok_audio` |
| `DB_USER` | Usuário PostgreSQL | `evok_admin` | `evok_admin` |
| `DB_PASSWORD` | Senha (segura!) | `evok_local_dev` | `SenhaForte123!` |
| `DB_SSL` | Usar SSL/TLS | `false` | `true` |
| `DB_FORCE_SYNC` | Force sync Sequelize | `false` (dev: true 1x) | `false` |
| `NODE_ENV` | Ambiente | `development` | `production` |

---

## Tabelas Criadas (01_schema.sql)

**Canônicas (Portuguese naming)**:
- `usuarios` — Usuários do ERP
- `fornecedores` — Suppliers
- `items` — Catálogo mestre (UUID PK)
- `item_categorias` — Categorias (NEW)
- `item_detalhes_comerciais` — Comercial/fiscal (NEW)
- `item_especificacoes_tecnicas` — Specs técnicas com JSONB (NEW)
- `item_estruturas` — BOM canônica (com 9 campos novos em 2A)
- `inventario_movimentacoes`, `lotes`, `ordens_producao`, etc.

**Legadas (English naming, criadas via Sequelize.sync)**:
- `products` — Produtos legacy (INTEGER PK)
- `bill_of_materials` — BOM legacy
- `bill_of_material_items` — Linhas de BOM legacy
- `product_categories` — Categorias legacy

**Tabelas de Migração (02a)**:
- `migracao_product_item_map` — Crosswalk Product → Item (auditoria)
- `migracao_bom_log` — Log de migração BOM (auditoria)

---

## Esquema de Migração (Phase 2)

Quando executar a migração de dados:

```bash
cd server

# 1. Seed de dados de teste (dados legados fictícios)
node dist/src/scripts/backfill/00_seed_legacy_test_data.js

# 2. Backfill de categorias
tsx src/scripts/backfill/02b-bis_category_to_item_categoria.ts

# 3. Backfill de produtos
tsx src/scripts/backfill/02b_product_to_item.ts

# 4. Backfill de BOM
tsx src/scripts/backfill/02c_bom_to_item_estrutura.ts

# 5. Validar integridade
psql -h localhost -U evok_admin -d erp_evok_audio -f src/scripts/backfill/02d_validation.sql
```

---

## Troubleshooting

### Erro: "ECONNREFUSED 127.0.0.1:5432"

PostgreSQL não está rodando:
```bash
# Docker local
docker compose up -d

# Servidor remoto: verificar host, porta, firewall
ping seu-servidor.com
psql -h seu-servidor.com -U evok_admin -d erp_evok_audio -c "SELECT version();"
```

### Erro: "relation 'X' does not exist"

Schemas ainda não foram aplicados:
```bash
psql -h localhost -U evok_admin -d erp_evok_audio -f server/database/postgresql/01_schema.sql
psql -h localhost -U evok_admin -d erp_evok_audio -f server/database/postgresql/02a_extend_item_estruturas.sql
```

### Erro: "CREATE TYPE IF NOT EXISTS" (PostgreSQL 16)

Versão antiga do SQL. Use o 02a_extend_item_estruturas.sql que já foi corrigido com `DO $$ ... $$`:
```bash
# Versão corrigida
psql -h localhost -U evok_admin -d erp_evok_audio -f server/database/postgresql/02a_extend_item_estruturas.sql
```

### Tabelas legadas não existem

Falta executar Sequelize.sync. Temporariamente em `.env`:
```
DB_FORCE_SYNC=true
```

Depois iniciar o servidor uma vez e desativar:
```bash
npm start  # Cria tabelas legadas
# Ctrl+C

# Editar .env
DB_FORCE_SYNC=false
```

---

## Segurança

### ⚠️ NUNCA versionar .env com dados reais

- `.env` é `.gitignored` (não enviado ao repo)
- Usar `.env.example` como template
- Em CI/CD: injetar variáveis de ambiente via secrets (GitHub, GitLab, etc)
- `JWT_SECRET`, `DB_PASSWORD` devem ser diferentes por ambiente

### Senhas Recomendadas

**Desenvolvimento local**: `evok_local_dev` (simples, fácil lembrar)  
**Staging**: Gerar com `openssl rand -base64 24`  
**Produção**: Gerar com `openssl rand -base64 32` e armazenar em gerenciador de secrets

---

## Próximas Fases

- **Fase 2B**: Backfill Product → Item (32 produtos, com Thiele-Small)
- **Fase 2C**: Backfill BOM → ItemEstrutura (5 BOMs, hierarquia)
- **Fase 2D**: Validação (8 queries SQL para integridade)
- **Fase 3**: Workflow de versão em ItemEstrutura
- **Fase 4**: Reescrita de FKs em 16 tabelas

---

## Referências

- [Postgres 16 Docs](https://www.postgresql.org/docs/16/)
- [Docker Compose Postgres](https://hub.docker.com/_/postgres)
- [Sequelize Migrations](https://sequelize.org/docs/v6/other-topics/migrations/)
- [ERP EVOK README](../README.md)

