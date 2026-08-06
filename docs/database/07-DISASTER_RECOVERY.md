# Plano de Continuidade (Disaster Recovery) — ERP EVOK ÁUDIO

Auditoria real do ambiente em 2026-08-06 — o que está **implementado**
vs. o que é **aspiracional** (mencionado no CLAUDE.md/checklists, mas
ainda não exercitado de fato).

## 1. Rotinas de Backup

### O que existe (implementado)

- **Scripts prontos e testáveis:** `scripts/backup-postgres.sh` (Linux/CI)
  e `scripts/backup-postgres.ps1` (Windows), ambos fazendo
  `pg_dump -Fc -Z 9` (formato custom comprimido) do container
  `evok-postgres`, com:
  - retry com backoff (`BACKUP_MAX_ATTEMPTS`, default 3 tentativas, 30s
    entre elas) — cobre o caso do container ainda estar subindo logo
    após um reboot;
  - política de retenção configurável (default 14 backups mais recentes,
    apaga os mais antigos automaticamente);
  - notificação de falha via webhook (`AUDIT_ALERT_WEBHOOK_URL`) quando
    todas as tentativas falham;
  - saída em `backups/` na raiz do repo (fora do volume Docker,
    listado em `.gitignore` — não versionado, correto).
- **Scripts de agendamento prontos:** `scripts/schedule-backup-cron.sh`
  (crontab Linux, idempotente) e `scripts/schedule-backup-task.ps1`
  (Agendador de Tarefas do Windows).
- **Backups reais gerados manualmente em `backups/`:** 7 arquivos
  `.dump`, todos de **31/07/2026** (258 KB a 348 KB cada) — evidência de
  que o script funciona quando executado, mas não de que está agendado
  ativamente hoje.

### O que NÃO está confirmado/implementado (achado de auditoria)

- **Nenhuma execução automatizada foi confirmada ativa neste ambiente:**
  os backups em `backups/` param em 31/07/2026 — 6 dias sem novo arquivo
  até a data desta auditoria (06/08/2026), apesar de o repositório ter
  recebido dezenas de migrations e mudanças de schema nesse intervalo.
  Isso é **consistente com o fato de este ser um ambiente de
  desenvolvimento local, não o servidor de produção** (que ainda não foi
  adquirido — ver `docs/governance/TODO.md`), mas significa que **a
  frase "Backup: PostgreSQL dump diário via cron" do CLAUDE.md descreve o
  plano, não um fato verificado em produção** — não existe ainda um
  servidor de produção onde essa rotina esteja rodando.
- **`docker-compose.prod.yml` não existe** no repositório (verificado por
  busca de arquivo) — o checklist de `docs/infra/DEPLOY_UBUNTU.md` já
  lista isso como pendência de Go-Live.
- **Volume `app_uploads`** (fotos/desenhos de produto) não tem nenhum
  script de backup dedicado — os scripts atuais cobrem **apenas o dump
  do Postgres**, não os arquivos enviados via multer. O próprio
  `docker-compose.yml` já comenta isso ("Este diretório DEVE entrar na
  rotina de backup junto com o dump do Postgres"), mas não há
  automação que faça isso hoje.
- **Sem rotação/retenção testada em produção real** — a lógica de
  retenção (`RETENTION=14`) só foi exercitada localmente.

### Recomendação objetiva para o Go-Live

1. No servidor de produção (quando adquirido), rodar
   `./scripts/schedule-backup-cron.sh --time "0 3 * * *" --retention 14`
   **imediatamente após o primeiro deploy**, antes de considerar o
   Go-Live aprovado.
2. Estender o backup (script novo ou parâmetro adicional) para incluir
   um `tar`/`rsync` do volume `app_uploads`, não apenas o `pg_dump`.
3. Validar que `AUDIT_ALERT_WEBHOOK_URL` está configurado em produção
   (sem isso, uma falha silenciosa de backup só é percebida no dia em
   que alguém precisar restaurar).
4. Considerar backup **fora do próprio servidor** (ex.: sincronizar
   `backups/` para um object storage externo) — hoje o backup vive no
   mesmo disco do servidor que ele protege, o que não cobre falha total
   de disco/servidor (só cobre erro humano/corrupção lógica).

## 2. Processo de Restore

### Comando documentado (não testado em ambiente de restore dedicado nesta auditoria)

```bash
# 1. Copiar o dump para dentro do container (ou gerar novo container vazio)
docker cp backups/erp_evok_audio_YYYYMMDD_HHMMSS.dump evok-postgres:/tmp/restore.dump

# 2. Restaurar (banco precisa existir e estar vazio, ou usar --clean)
docker exec -i evok-postgres pg_restore -U evok_admin -d erp_evok_audio \
  --clean --if-exists /tmp/restore.dump

# 3. Verificar
docker exec evok-postgres psql -U evok_admin -d erp_evok_audio \
  -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';"
# Esperado: 78 tabelas de negócio + SequelizeMeta = 79
```

**Nota técnica:** os dumps atuais em `backups/` foram gerados sem `-Fc`
no `docker-compose.yml`/README antigos (formato SQL texto puro, via
`pg_dump -U evok_admin -d erp_evok_audio > backup.sql`,
`docs/infra/DEPLOY_UBUNTU.md`), enquanto os scripts novos
(`scripts/backup-postgres.sh`/`.ps1`) usam `-Fc -Z 9` (formato custom
comprimido, requer `pg_restore`, não `psql < arquivo.sql`). **Os dois
métodos de restore são diferentes** — confirmar qual formato o backup
real em mãos usa antes de escolher `psql -f` vs `pg_restore`.

### Provisionamento completo de um servidor novo (cenário catastrófico total)

Passo a passo consolidado a partir de `docs/infra/DEPLOY_UBUNTU.md`:

1. Provisionar servidor Ubuntu 24.04 + Docker + Docker Compose.
2. Clonar o repositório, configurar `.env` com senhas fortes (nunca
   reaproveitar valores de dev).
3. **Não aplicar `server/database/postgresql/01_schema.sql`** (schema
   incompleto/histórico) — usar `docker compose up -d` seguido de
   `cd server && npm ci && npm run migration:up` (as 64 migrations
   recriam o schema do zero corretamente).
4. Restaurar o dump de dados mais recente (`pg_restore`/`psql -f`,
   conforme formato — ver nota acima) **depois** das migrations
   aplicadas, nunca antes (migrations em banco vazio criam o schema;
   restaurar por cima de um schema já criado por migration pode gerar
   conflito de `SequelizeMeta` — recomenda-se restaurar em banco
   **recém-criado, vazio**, e então rodar as migrations por cima seria
   incorreto se o dump já contém `SequelizeMeta` populada; a alternativa
   mais segura é sempre restaurar o dump completo — que já inclui
   `SequelizeMeta` — em vez de rodar migrations do zero e depois
   restaurar dados).
5. Restaurar o volume `app_uploads` a partir do backup de arquivos (ver
   pendência §1 item 2).
6. Validar `GET /health/ready` retorna `{ "database": true }`.

### Status honesto

**Este processo NUNCA foi exercitado de ponta a ponta em um ambiente
limpo/servidor novo** (nem em staging, nem em produção — que ainda não
existe). É um runbook documentado e tecnicamente coerente, mas **não
testado**. Marcar explicitamente como pendência do checklist de Go-Live:
`docs/infra/DEPLOY_UBUNTU.md` já lista "Backup local foi testado (restore
funciona)" como item do checklist — na data desta auditoria, esse item
segue **não confirmado**.

## 3. RPO/RTO — não formalizados

Não existe, na data desta auditoria, uma definição formal de:
- **RPO (Recovery Point Objective):** quanto de dado a empresa aceita
  perder em caso de desastre. Com backup diário (quando ativado), o RPO
  implícito seria de até 24h — mas isso não foi formalmente aprovado
  pelo dono do produto/CFO.
- **RTO (Recovery Time Objective):** quanto tempo aceitável para
  restaurar o sistema operante. Não medido (nunca foi cronometrado um
  restore completo).

**Recomendação:** definir RPO/RTO formalmente como parte da aprovação do
Go-Live G6, e cronometrar um restore de teste completo (item já listado
no checklist de `docs/infra/DEPLOY_UBUNTU.md`) para ter um RTO real
medido, não estimado.
