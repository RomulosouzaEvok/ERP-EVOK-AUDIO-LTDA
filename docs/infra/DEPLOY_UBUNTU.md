# 📦 Deploy PostgreSQL em Docker Compose — Ubuntu 24.04

**Data:** 2 de agosto de 2026 (revisado 2026-08-06)
**Ambiente:** PostgreSQL 16 (Alpine) + API Node.js
**SSOT:** Este arquivo é o guia de deploy e operação no Ubuntu

---

> ⚠️ **AVISO — SCHEMA É APLICADO VIA MIGRATIONS, NÃO VIA SQL MANUAL**
>
> O schema do banco de dados **não deve ser aplicado com `psql -f
> server/database/postgresql/01_schema.sql`** (ou os demais `.sql` legados
> nessa pasta). Esses arquivos estão **incompletos** frente ao schema atual
> (faltam requisições de compra, work centers e várias foreign keys
> críticas) e estão marcados **HISTÓRICO/DEPRECATED**. O mecanismo real e
> suportado é rodar as **53 migrations versionadas** do Sequelize:
>
> ```bash
> cd server
> npm ci
> npm run migration:up
> ```
>
> Provisionar um servidor novo com os SQL manuais resulta em schema
> quebrado. Veja também [docs/DATABASE_SETUP.md](../DATABASE_SETUP.md).

---

## 🔧 Pré-Requisitos

### Instalado no Ubuntu
```bash
# Verificar instalação
docker --version
docker compose version

# Se não tiver:
sudo apt update
sudo apt install -y docker.io docker-compose-plugin
sudo usermod -aG docker $USER
newgrp docker
```

### Variáveis de Ambiente Seguras
```bash
# Copiar template e EDITAR com senhas fortes (CRÍTICO!)
cp .env.example .env
# Editar: DB_PASSWORD, JWT_SECRET, ADMIN_SEED_PASSWORD
vim .env
```

---

## 🚀 Iniciar Banco de Dados

### Primeira Vez (Criar Volume + Iniciar)
```bash
cd /caminho/para/erp-evok-audio

# Validar docker-compose.yml antes de subir
docker compose config

# Subir postgres + api
docker compose up -d

# Verificar saúde (healthcheck)
docker compose ps
# STATUS deve ser "healthy"

# Ver logs
docker compose logs -f postgres  # Banco
docker compose logs -f api       # API
```

### Dia a Dia (Reiniciar após reboot Ubuntu)
```bash
docker compose up -d
# Pronto! Restart policy cuida de subir sozinho.
```

---

## 📊 Verificações de Saúde

### 1. Database Está Rodando?
```bash
docker exec evok-postgres pg_isready -U evok_admin -d erp_evok_audio
# Esperado: accepting connections
```

### 2. Conectar ao Database (SSH)
```bash
# Pelo host local (Ubuntu)
psql -h 127.0.0.1 -U evok_admin -d erp_evok_audio -c "SELECT version();"
# Prompt: Senha do .env (DB_PASSWORD)

# Pelo container
docker exec -it evok-postgres psql -U evok_admin -d erp_evok_audio -c "SELECT count(*) as tabelas FROM information_schema.tables WHERE table_schema='public';"
```

### 3. API Conectada ao DB?
```bash
# Logs da API devem dizer: "Database connection successful"
docker compose logs api | grep -i "database\|connected"

# Ou acessar endpoint de health
curl -s http://localhost:5000/health/ready | jq
# Esperado: { "status": "ready", "database": true }
```

---

## 🛑 Parar & Limpar

### Parar Temporariamente (dados persistem)
```bash
docker compose down
# Volume postgres_data NOT deletado — dados seguros
```

### Deletar Tudo (CUIDADO! Perder dados industrial)
```bash
docker compose down -v
# ⚠️ Todos os dados do banco deletados
# Use APENAS se tiver backup seguro
```

### Backup do Database Antes de Desligar
```bash
docker exec evok-postgres pg_dump -U evok_admin -d erp_evok_audio > backup_$(date +%Y%m%d_%H%M%S).sql

# Restaurar de um backup
docker exec -i evok-postgres psql -U evok_admin -d erp_evok_audio < backup_20260802_123456.sql
```

---

## 🔄 Cenários de Troubleshooting

### Cenário 1: Banco não conecta (`ECONNREFUSED`)
```bash
# Problema: healthcheck falhou
docker compose logs postgres | tail -50

# Solução provável: senha errada no .env
vim .env  # Verificar DB_PASSWORD

# Reconstruir
docker compose down
docker volume rm erp-evok-audio_postgres_data  # ⚠️ Deleta dados!
docker compose up -d
```

### Cenário 2: API não conecta ao DB
```bash
# Verificar:
1. docker compose logs api | grep -i "error\|connect"
2. Database está saudável? → docker compose ps
3. DB_HOST na API está como "postgres" (hostname do service)? → docker compose config | grep DB_HOST

# Geralmente é timeout: aguarde healthcheck
sleep 30 && docker compose ps
```

### Cenário 3: Banco cheio, disco cheio
```bash
# Verificar tamanho do volume
docker system df

# Fazer limpeza
docker system prune -a  # Remove imagens não usadas
docker volume ls | grep postgres_data
```

---

## 📋 Checklist de Go-Live (Pré-Deploy em Produção)

- [ ] `.env` tem senhas fortes (não default dev)
- [ ] `docker compose config` não tem erros
- [ ] Banco sobe e fica healthcheck green
- [ ] API conecta ao banco (`/health/ready` retorna true)
- [ ] Schema aplicado via `npm run migration:up` (tabelas existem, todas as 53 migrations status `up`)
- [ ] Backup local foi testado (restore funciona)
- [ ] Logs estão sendo rotacionados (max-size: 10m)
- [ ] Rede PostgreSQL isolada (127.0.0.1:5432 apenas)
- [ ] TZ=America/Sao_Paulo está configurado (Postgres e API)

---

## 🎯 Próximos Passos

1. **Aplicar o schema (migrations versionadas, mecanismo canônico):**
   ```bash
   cd server
   npm ci
   npm run migration:status   # ver o que falta aplicar
   npm run migration:up
   ```
   > ⚠️ Não use `psql -f server/database/postgresql/01_schema.sql` (ou
   > demais `.sql` legados) — ver aviso no topo deste documento.

2. **Teste de Integridade:**
   ```bash
   npm test -- server/__tests__/database/
   # Todos os testes de FK e schema devem passar
   ```

3. **Monitoramento Contínuo:**
   ```bash
   watch -n 2 'docker compose ps'
   # Roda a cada 2 segundos, monitora STATUS do container
   ```

---

## ✅ Checklist de prontidão — antes do Go-Live no servidor de produção

Itens levantados na auditoria de infraestrutura de 2026-08-06. Marcar cada um
antes de aprovar o Go-Live no VPS/servidor físico definitivo:

- [ ] **Reverse proxy + TLS** (nginx ou Caddy) na frente da API, com
      certificado Let's Encrypt válido e renovação automática configurada;
      porta da API (`5000`) vinculada a `127.0.0.1:5000:5000` no
      `docker-compose.yml` de produção (não exposta em `0.0.0.0` direto na
      internet).
- [ ] **Volume/backup de uploads**: volume nomeado `app_uploads` (fotos/
      desenhos de produto) incluído na rotina de backup, junto com o dump do
      Postgres — testar restore de ambos.
- [ ] **`docker-compose.prod.yml`** dedicado com `NODE_ENV=production` e
      `DB_SSL=true` validado de ponta a ponta (conexão real com certificado,
      sem depender de `ALLOW_LOCAL_DB_NO_SSL`).
- [ ] **Cron de backup ativado** (`scripts/schedule-backup-*`) rodando no
      servidor de produção, com verificação de que os arquivos de backup
      estão sendo gerados e são íntegros.
- [ ] **Logs estruturados** (Winston ou equivalente) — pendente, item P1 do
      roadmap; validar que ao menos os logs de erro/acesso estão sendo
      persistidos e rotacionados no servidor definitivo.
- [ ] Schema aplicado via `npm run migration:up` (não via SQL manual legado)
      e validado com `npm run migration:status`.
- [ ] `.env` de produção com `DB_PASSWORD`, `JWT_SECRET`,
      `ADMIN_SEED_PASSWORD` fortes e únicos (nunca reaproveitar valores de
      dev/staging).

---

**Status:** ✅ Docker Compose pronto para Go-Live  
**Última Atualização:** 2026-08-02  
**Responsável:** DevSecOps (Especialista Docker)
