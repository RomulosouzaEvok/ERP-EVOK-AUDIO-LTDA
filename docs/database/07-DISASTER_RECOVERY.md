# Plano de Continuidade (Disaster Recovery) — ERP EVOK ÁUDIO

> 🔒 **AVISO — comandos deste documento contra `erp_evok_audio` (sem sufixo `_test`) tocam DADO REAL de produção**
>
> `erp_evok_audio` é o único banco do projeto — não existe banco de produção
> separado. Por decisão humana explícita (`APR-2026-016`, em
> `coretriad/governance/APPROVALS.md`, posterior a este documento), ele é
> classificado **PRODUÇÃO REAL**, mesmo descrito abaixo como "ambiente de
> desenvolvimento local". Isso vale sobretudo para a seção "Processo de
> Restore" (`pg_restore -d erp_evok_audio --clean --if-exists`), que
> **sobrescreve** o banco real.
>
> - **Quem PODE executar:** um humano responsável, em cenário real de
>   recuperação de desastre ou teste de restore autorizado.
> - **Quem NÃO PODE, sem exceção:** nenhum agente automatizado (IA) — a
>   **regra permanente de segurança de dado real**
>   (`coretriad/states/ERP-LEGACY-001/PROJECT_STATE.md`) veda a qualquer
>   agente, em qualquer passo do programa `ERP-LEGACY-001` (21-40), comando
>   que conecte a este banco. Testes de restore por agente devem sempre usar
>   um banco descartável (como já faz §2.1 abaixo, em
>   `erp_evok_audio_restore_test`), nunca sobrescrever `erp_evok_audio` em
>   si.
> - **Referência normativa:** `APR-2026-016` + `PROJECT_STATE.md` (seção
>   "Regra permanente de segurança de dado real"). Aviso adicionado após o
>   finding `AUD-PROC-CUSTODIA-01`.

Auditoria real do ambiente em 2026-08-06 — o que está **implementado**
vs. o que é **aspiracional** (mencionado no CLAUDE.md/checklists, mas
ainda não exercitado de fato). **Atualizado no mesmo dia (rodada de
remediação)** com a ativação real do agendamento local e um teste de
restore ponta a ponta contra o banco local — ver §1.1 e §2.1.

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
- **`docker-compose.prod.yml`** — ✅ **criado em 2026-08-06** (raiz do
  repo), esqueleto pronto para quando o servidor de produção existir
  (não implantado de verdade ainda — sem servidor real para testar).
  Ver `docs/infra/DEPLOY_UBUNTU.md` e §1.1/§2.1 abaixo para o que foi
  de fato validado nesta rodada de remediação.
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

## 1.1 Remediação implementada (2026-08-06) — agendamento ativado neste ambiente

**O que foi de fato feito e confirmado no ambiente local (Windows):**

1. **Agendamento real registrado** via
   `scripts/schedule-backup-task.ps1 -Time "03:00" -Retention 14`
   (Agendador de Tarefas do Windows, escopo do usuário atual — **não
   exigiu privilégio de administrador**). Confirmado com
   `Get-ScheduledTask -TaskName 'EvokAudioPostgresBackup' |
   Get-ScheduledTaskInfo`:
   ```
   TaskName    : EvokAudioPostgresBackup
   State       : Ready
   NextRunTime : 07/08/2026 03:00:00
   ```
   Isto **é o equivalente Windows do cron** mencionado no CLAUDE.md — a
   tarefa existe e está agendada de verdade neste ambiente, não é mais
   apenas um script pronto e nunca registrado. Em produção (Ubuntu), o
   equivalente é `./scripts/schedule-backup-cron.sh --time "0 3 * * *"
   --retention 14` (crontab, mesmo idempotente).
2. **Execução manual do script confirmada no mesmo dia**: rodar
   `scripts/backup-postgres.sh` gerou
   `backups/erp_evok_audio_20260806_145213.dump` (624 KB, formato
   `pg_dump -Fc -Z 9`) — quebra a lacuna de 6 dias sem backup identificada
   na auditoria original (últimos dumps eram todos de 31/07/2026).
3. **Limitação honesta:** este agendamento vale **apenas para esta
   máquina de desenvolvimento** (a tarefa roda localmente, contra o
   `evok-postgres` deste Docker Desktop). Quando o servidor de produção
   Ubuntu for provisionado, o passo 1 acima (`schedule-backup-cron.sh`)
   precisa ser executado **naquele** servidor — este item continua
   listado no checklist de `docs/infra/DEPLOY_UBUNTU.md` como pendência
   de Go-Live, não como resolvido globalmente.

## 2.1 Teste de restore ponta a ponta (2026-08-06) — executado e confirmado

Diferente do runbook anterior (nunca exercitado), o processo abaixo **foi
executado de verdade** contra o banco local, com evidência registrada:

```bash
# 1. Dump fresco gerado pelo script padrão do projeto
./scripts/backup-postgres.sh
# → backups/erp_evok_audio_20260806_145213.dump (624 KB)

# 2. Banco de teste descartável, isolado do banco real
docker exec evok-postgres psql -U evok_admin -d postgres \
  -c "CREATE DATABASE erp_evok_audio_restore_test OWNER evok_admin;"

# 3. Copia o dump para dentro do container e restaura no banco de teste
docker cp backups/erp_evok_audio_20260806_145213.dump \
  evok-postgres:/tmp/restore_test.dump
docker exec evok-postgres pg_restore -U evok_admin \
  -d erp_evok_audio_restore_test --no-owner --no-privileges \
  /tmp/restore_test.dump
# → concluiu sem nenhum erro

# 4. Verificação: contagem de tabelas e de linhas, banco real vs. restaurado
docker exec evok-postgres psql -U evok_admin -d erp_evok_audio_restore_test \
  -tA -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';"
# → 79 (idêntico ao banco real)

# Comparação de linhas por tabela nas 79 tabelas (query_to_xml + string_agg),
# banco real vs. banco restaurado
# → "IDENTICAL - all table row counts match" (as 79 tabelas batem, incluindo
#    amostras conferidas manualmente: users=306, items=13, suppliers=2,
#    production_orders=126, sale_items=134, inventory_movements=463,
#    SequelizeMeta=64)

# 5. Limpeza do banco de teste (sem deixar resíduo no ambiente)
docker exec evok-postgres psql -U evok_admin -d postgres \
  -c "DROP DATABASE erp_evok_audio_restore_test;"
docker exec evok-postgres rm -f /tmp/restore_test.dump
```

**Resultado: RESTORE VALIDADO** — o dump gerado pelo script atual
(`pg_dump -Fc -Z 9`) é restaurável de ponta a ponta com `pg_restore
--no-owner --no-privileges`, e os dados batem exatamente (79/79 tabelas,
contagem de linhas idêntica) entre o banco de origem e o restaurado.

**Nota de defasagem (registrada, não retroativamente "corrigida"):** este
teste foi executado antes da migration
`20260806-000090-create-import-processes.cjs` (módulo COMEX/Importação)
ser aplicada — os números acima (79 tabelas, `SequelizeMeta=64`) são a
evidência real daquele teste específico e **não foram alterados** para
não falsificar o registro. O schema atual (mesmo dia, pós-COMEX) tem 80
tabelas de negócio + `SequelizeMeta` = 81, com 66 migrations. A mecânica
de backup/restore não muda com tabelas novas (é um `pg_dump`/`pg_restore`
do schema inteiro), então este teste continua válido como evidência de
que o processo funciona — mas o teste em si não foi re-executado contra o
schema pós-COMEX nesta rodada de documentação. Se for necessário
evidência atualizada, repetir o procedimento do zero (não apenas editar
os números aqui).

**O que este teste NÃO cobre (limitações honestas, não escondidas):**
- Foi executado **no mesmo host/mesma instância Docker** que gerou o
  backup — não simula perda total de servidor/disco (cenário de
  catastrophe recovery real, que exigiria restaurar em uma máquina
  totalmente nova).
- Não cobre o volume `app_uploads` (fotos/desenhos de produto) — apenas
  o dump do Postgres. Continua pendente estender o backup para cobrir
  esse volume (item já registrado abaixo).
- RTO não foi cronometrado formalmente neste teste (o restore em si foi
  rápido, poucos segundos, para um banco de ~625 KB — não é
  representativo do tempo de restore de um banco de produção real, que
  será ordens de grandeza maior).
- Não testou o cenário completo de "provisionar servidor novo do zero +
  rodar migrations + restaurar dump por cima" descrito no runbook da
  seção 2 abaixo — apenas o `pg_restore` isolado.

## 2. Processo de Restore

### Comando documentado — variante `--clean --if-exists` (não testada nesta rodada; a variante efetivamente testada foi a de banco novo/vazio, ver §2.1 acima)

```bash
# 1. Copiar o dump para dentro do container (ou gerar novo container vazio)
docker cp backups/erp_evok_audio_YYYYMMDD_HHMMSS.dump evok-postgres:/tmp/restore.dump

# 2. Restaurar (banco precisa existir e estar vazio, ou usar --clean)
docker exec -i evok-postgres pg_restore -U evok_admin -d erp_evok_audio \
  --clean --if-exists /tmp/restore.dump

# 3. Verificar
docker exec evok-postgres psql -U evok_admin -d erp_evok_audio \
  -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';"
# Esperado (schema atual, 2026-08-06 pós-COMEX): 80 tabelas de negócio + SequelizeMeta = 81
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
   `cd server && npm ci && npm run migration:up` (as 66 migrations
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

### Status honesto (atualizado 2026-08-06, pós-remediação)

**O núcleo do restore (`pg_restore` de um dump gerado por
`backup-postgres.sh` restaurando corretamente os dados) foi testado e
confirmado em §2.1** — isso não é mais teórico. O que **continua não
testado** é o cenário completo de catástrofe total descrito nos 6 passos
acima: nunca foi exercitado em um **servidor/máquina limpa e nova** (nem
em staging, nem em produção — que ainda não existe), incluindo os passos
1 (provisionar Ubuntu do zero), 2 (`.env` novo), 3 (`migration:up` em
banco vazio) e 5 (restaurar `app_uploads`). `docs/infra/DEPLOY_UBUNTU.md`
lista "Backup local foi testado (restore funciona)" como item do
checklist — **esse item específico agora pode ser marcado como
confirmado** (restore funciona, testado em 2026-08-06), mas o item mais
amplo "provisionamento completo de servidor novo testado" segue **não
confirmado**, pendente de servidor de produção real.

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
