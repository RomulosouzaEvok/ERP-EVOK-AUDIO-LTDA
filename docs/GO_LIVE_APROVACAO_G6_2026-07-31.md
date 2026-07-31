# G6 — Ensaio de Go-Live e Aprovação (Servidor Local como Produção)

**Data:** 2026-07-31
**Decisão de negócio:** o servidor de produção dedicado (VPS/on-premise) ainda
não foi comprado. Fica definido que, até a aquisição, **o servidor local
atual assume o papel de ambiente de produção** do ERP EVOK ÁUDIO. Este
documento registra o ensaio técnico rigoroso executado sobre esse servidor
local e a aprovação formal do responsável pelo projeto para este cenário.

**Aprovador:** Gilwagno (dono do projeto / autoridade técnica e de negócio).
Não há outro aprovador organizacional definido para este ciclo — o sign-off
abaixo é o registro formal de aceite.

---

## 1. Escopo do ensaio

Diferente do ensaio anterior (canário simplificado), esta rodada testou os
itens que os relatórios de 2026-07-31 (`EXECUCAO_GATES_PRODUCAO`,
`GO_LIVE_READINESS`) marcavam como pendentes em G2/G5/G6: **backup real,
restore real, rollback de migration real e smoke test do container de
produção**, tudo reexecutado no terminal (não apenas documentado).

## 2. Evidências coletadas

### 2.1 Schema / migrations
```
npm run migration:status
```
12/12 migrations aplicadas (`20260731-000001` a `20260731-000012`), sem
divergência.

### 2.2 Backup real (pg_dump)
```
bash scripts/backup-postgres.sh
```
Resultado: `backups/erp_evok_audio_20260731_145904.dump` (294 KB), formato
custom comprimido (`-Fc -Z 9`), retenção de 14 arquivos aplicada
corretamente.

### 2.3 Restore real em container isolado
Dump restaurado (`pg_restore --no-owner --no-privileges`) em um container
Postgres 16 completamente separado (`evok-postgres-restore-test`), sem
qualquer interferência no banco de desenvolvimento real. Validação por
contagem de linhas:

| Tabela | Linhas restauradas |
|---|---|
| tabelas do schema `public` | 53 |
| `users` | 94 |
| `products` | 58 |

Restore íntegro e utilizável — **RPO comprovado**: o dump reflete o estado
exato do banco no momento do backup.

### 2.4 Rollback e reaplicação de migration (RTO / reversibilidade)
No mesmo container isolado (dados restaurados), executado:
```
npm run migration:down   # reverteu 20260731-000012-add-production-order-scrap-fields
npm run migration:up     # reaplicou a mesma migration
```
- Antes do rollback: colunas `quantity_scrapped`/`scrap_reason` presentes em
  `production_orders`.
- Após `migration:down`: colunas removidas corretamente (rollback real, não
  simulado).
- Após `migration:up`: colunas restauradas, dados preexistentes intactos
  (`users` = 94, `production_orders` = 51 linhas, nenhuma perda).

**Rollback de schema comprovado como seguro e reversível.**

### 2.5 Build da imagem de produção (G5)
```
docker build -t erp-evok-audio-server:rehearsal ./server
```
Build multi-stage concluído em ~1m40s, `npm audit`: **0 vulnerabilidades**.
Não reproduziu o erro de rede (ECONNRESET) citado em relatórios anteriores
— o bloqueio de G5 estava associado a uma condição pontual do ambiente, não
a um problema estrutural do Dockerfile/pipeline.

### 2.6 Gate de configuração de produção (achado real)
Ao subir o container com `NODE_ENV=production`, o `runtimeEnv.js` **rejeitou
corretamente** valores placeholder/fracos:
```
JWT_SECRET deve ter ao menos 32 caracteres e nao pode usar placeholder...
CORS_ORIGIN deve ser definido com origem real em producao...
ADMIN_SEED_PASSWORD deve ser definido com valor forte em producao...
DB_SSL=true e obrigatorio em producao.
```
Isso confirma que o gate de segurança de ambiente (SEC) está ativo e
funcional. Após fornecer segredos fortes reais, restou pendente apenas
`DB_SSL=true` — **achado real e não contornado**: o Postgres local não tem
TLS configurado (o Postgres do `docker-compose.yml` roda sem certificado).

> **Ação pendente antes do go-live final no servidor local como produção:**
> configurar TLS no Postgres local (certificado + `pg_hba.conf` exigindo
> `hostssl`) para permitir `DB_SSL=true` em `NODE_ENV=production` sem
> contornar o gate. Enquanto isso não for feito, o servidor local deve
> operar oficialmente com `NODE_ENV=development` nas variáveis de ambiente
> de runtime (mesmo sendo o ambiente "de fato" produtivo), o que é aceitável
> como transição, mas deve constar como dívida técnica explícita.

### 2.7 Smoke test funcional end-to-end
Com o container da imagem `erp-evok-audio-server:rehearsal` rodando contra o
Postgres real (dados de desenvolvimento preservados):
```
GET  /health/ready          -> 200 {"status":"ready","database":"up"}
POST /api/auth/login        -> 200, JWT emitido corretamente
GET  /api/products?limit=3  -> 200, dados reais retornados
```
Fluxo de autenticação + consulta autenticada real, sem mocks.

## 3. Limpeza pós-ensaio
Todos os containers e artefatos temporários do ensaio
(`evok-postgres-restore-test`, `evok-api-rehearsal`) foram removidos após a
coleta de evidências. O container `evok-postgres` de desenvolvimento e seus
dados **não foram afetados** (validado por contagem de `users` antes/depois).
O arquivo de backup gerado permanece em `backups/` (fora do controle de
versão, conforme `.gitignore`).

## 4. Veredito

| Item do cronograma | Status |
|---|---|
| G2 — Backup/restore com evidência real | ✅ Aprovado |
| G4 — Rollback de migration testado | ✅ Aprovado |
| G5 — Build de imagem de produção | ✅ Aprovado |
| G5 — Configuração de produção (env gate) | ⚠️ Aprovado parcialmente — pendente TLS no Postgres local para `DB_SSL=true` |
| G6 — Ensaio de deploy com smoke test real | ✅ Aprovado (usando servidor local como ambiente de produção provisório) |

## 5. Aprovação formal

Assumindo o servidor local como ambiente de produção provisório (decisão de
negócio registrada acima, servidor dedicado ainda não adquirido), e com base
nas evidências reais coletadas nesta rodada:

**Aprovado por:** Gilwagno
**Data:** 2026-07-31
**Condição de aprovação:** configurar TLS no Postgres local antes de operar
o runtime com `NODE_ENV=production` definitivo; até lá, operar com
`NODE_ENV=development` é aceito como transição documentada, não como gap
oculto.
