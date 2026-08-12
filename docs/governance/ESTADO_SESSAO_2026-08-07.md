# Estado da Sessão — 2026-08-07 (fim de tarde) + Guia de Subida em Outra Máquina

> ## ⚠️ DOCUMENTO HISTÓRICO DE SESSÃO — SUPERADO
>
> Este é o retrato de **uma sessão específica (2026-08-07)**, não o estado atual
> do projeto. Muita coisa mudou desde então (os 17 gaps da cadeia do produto,
> baseline de schema congelado, carga inicial de 327 insumos, organograma no
> banco, remediações de 2026-08-12). **Não use para decidir o que fazer.**
>
> Para o estado atual: [`CLAUDE.md`](../../CLAUDE.md) (status/stack/runbook) e
> [`RESIDUAIS_ABERTOS_2026-08-10.md`](RESIDUAIS_ABERTOS_2026-08-10.md)
> (pendências medidas). O que continua útil aqui é o **guia de subida em outra
> máquina** (§ final) — mas confira os comandos contra o `README.md` atual.
>
> *Banner adicionado em 2026-08-12 pela auditoria documental.*

**Objetivo deste documento:** snapshot exato de onde o trabalho parou nesta máquina
e o passo a passo para continuar/subir o sistema em outra máquina. Complementa
`docs/governance/RESIDUAIS_ABERTOS_2026-08-10.md` (fonte de pendências medida),
`docs/governance/TODO.md` (diário histórico) e `docs/governance/HANDOFF_CODEX.md`.

---

## 1. O que foi feito hoje (2026-08-07, nesta sessão)

Commits desta sessão (todos pushados em `origin/main`):

| Commit | Conteúdo |
|---|---|
| `f214066` | Design completo do Bloco 3 Jurídico (46 RF, 71 endpoints, 12 migrations `jur_*` 000260..271) + auditoria APROVADA COM RESSALVAS + plano de substituição do módulo enxuto |
| `c37048b` | Relatórios de verificação dos módulos implantados fora do pipeline: Facilities (GAPS CRÍTICOS), Marketing (GAPS CRÍTICOS), CONT/TES/CTR (APROVADO COM RESSALVAS) |
| `0d97b12` | **Passada 1 do Jurídico completo**: substitui o módulo enxuto (`legal_*`→`jur_*`, migration de transição 000280), 35/71 endpoints (Contratos 13, Contencioso 15, Prazos Fatais 7), 16 models, 49 testes. Suíte 1024/1025 |
| (este) | Fix da migration 000268 (bug do Sequelize com `comment` contendo parênteses), script `server/scripts/apply-pending-migrations.cjs`, este documento |

Contexto anterior do dia: outro PC entregou `2ad27fd` (Facilities/Marketing/Jurídico
enxuto) e `aaf6ec5` (Contabilidade/Tesouraria/Controladoria). **Decisão do dono:**
o Bloco 3 completo SUBSTITUI o Jurídico enxuto (já executado na passada 1).

## 2. Estado do banco local DESTA máquina (importante)

O banco desta máquina estava defasado: faltavam TODAS as migrations `20260806-*`
(RFQ, centros de custo, downtimes, conciliação, COMEX, CNAB, sale_invoices etc.)
porque SST/TI haviam sido aplicadas fora de ordem. Hoje foram aplicadas **41
migrations** via `server/scripts/apply-pending-migrations.cjs`:

- Lote `20260806-000001..120` (24 migrations das rodadas de 06/08)
- `20260807-000200/210/220` (Facilities, Marketing, Jurídico enxuto)
- `20260807-000230/231/240/250` (Contabilidade, Tesouraria, Orçamento)
- `20260807-000260..271` (16 tabelas `jur_*` do Bloco 3)
- `20260807-000280` (transição: migra dados `legal_*`→`jur_*` e dropa as 4 tabelas antigas)

Estado final verificado: 16 tabelas `jur_*`, 0 tabelas `legal_*`, SequelizeMeta consistente.

## 3. Como subir o sistema em outra máquina

Pré-requisitos: Docker Desktop, Node 18+ (dev local usa 24.x), Git.

```bash
# 1. Clonar/atualizar
git clone https://github.com/gilwagno/ERP-Evok--Audio-LTDA.git   # ou git pull
cd ERP-Evok--Audio-LTDA

# 2. Configurar ambiente
cp .env.example .env          # raiz: DB_PASSWORD (obrigatória p/ compose)
# server/.env: DB_HOST=localhost, DB_PORT=5432, DB_NAME=erp_evok_audio,
#              DB_USER=evok_admin, DB_PASSWORD=<mesma do compose>, JWT_SECRET,
#              ADMIN_SEED_PASSWORD

# 3. Dependências
npm run install-all

# 4. Subir Postgres + API (compose builda a imagem da API se não existir)
docker compose up -d --build

# 5. Aplicar migrations pendentes (NÃO usar migration:up cru — ver comentário
#    no próprio script; ele é idempotente e respeita a ordem)
node server/scripts/apply-pending-migrations.cjs

# 6. Rebuild da API após migrations novas (se o passo 4 buildou antes do pull)
docker compose build api && docker compose up -d api

# 7. Frontend web (dev)
cd client && npm run dev      # http://localhost:5173

# 8. Smoke test
curl http://localhost:5000/health/ready   # esperado: {"status":"ready","database":"up"}
```

Atenção na outra máquina: se o banco de lá já tinha o módulo Jurídico enxuto com
dados, a migration `20260807-000280` migra contratos/aditivos/PI para `jur_*`
automaticamente antes de dropar as tabelas antigas. Se o banco de lá também
estiver com lacunas de `20260806-*`, o passo 5 resolve na ordem certa.

## 4. Trabalho em andamento / próximos passos (ordem combinada)

1. **Bloco 3 JUR — passada 2 do backend** (36/71 endpoints restantes): Procurações
   (6), Propriedade Intelectual (6), LGPD (17), Transversal — alertas/relatório
   financeiro sanitizado/fichas (7). Models já existem; contrato em
   `docs/business/BLOCO_3_JUR_API.md`. Agente: `programador`.
2. **Bloco 3 JUR — telas**: `client/src/pages/legal/` e `client/src/api/legal.ts`
   estão QUEBRADOS em runtime (a rota `/api/legal` foi substituída por `/api/jur`)
   — reconstruir seguindo o contrato novo. Reaproveitamento estimado pela
   auditoria: ContractsTab ~40-50%, IntellectualPropertyTab ~50-60%. Agentes:
   `PromadorFonteEnd` → `webdesiner`.
3. **Facilities — correção de GAPS CRÍTICOS** (`docs/business/BLOCO_4_FAC_VERIFICACAO.md`):
   14/17 regras não atendidas; refazer frota como extensão de `assets` (decisão
   D-2), adicionar condutores/CNH/diário de uso/multas CTB, manutenção predial e
   visitantes.
4. **Marketing — correção de GAPS CRÍTICOS** (`docs/business/BLOCO_5_MKT_VERIFICACAO.md`):
   conversão de lead deve exigir cliente vinculado, métricas de campanha derivadas
   (não editáveis), processo de eventos/feiras, KPIs de funil.
5. **CONT/TES/CTR — 2 achados P1** (`docs/governance/auditorias/AUDITORIA_CONT_TES_CTR_2026-08-07.md`):
   orçado×realizado filtra por `due_date` (deveria ser pagamento efetivo);
   conta contábil `active=false` ainda aceita lançamentos.
6. **Bloco 6 — RH lacunas** (não iniciado): pipeline padrão a partir de
   `docs/business/briefs/BRIEF_RH_2026-08-06.md`.

Pendências de design do Bloco 3 (documentadas nos artefatos): tabela de atos
societários (RF-JUR-030), alçada de aprovação de contrato (RF-JUR-003).

## 5. Convenção de trabalho combinada com o dono (2026-08-07)

- Modo contínuo: implementar sem parar; **a cada implementação validada →
  commit → push**.
- Pipeline por bloco: AnalistaNegocios → AdmDBA + ArquitetoSoftwareAPI →
  AuditorIntegrador → programador → PromadorFonteEnd/webdesiner → validação.
- Validação independente antes de cada commit: `npm run typecheck` +
  `npm run test:unit` no server (falha pré-existente conhecida:
  `onda3-shipping-cockpit-cashflow.test.ts`, dependente de data).
