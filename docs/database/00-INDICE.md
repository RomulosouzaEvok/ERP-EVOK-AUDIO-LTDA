# Documentação de Banco de Dados — ERP EVOK ÁUDIO

**Dono:** DBA/Arquiteto de Dados (`AdmDBA`) — qualquer alteração de schema (nova
migration) DEVE atualizar os arquivos relevantes desta pasta **no mesmo
ciclo de trabalho**, não como tarefa pontual futura. Isso vale sobretudo
para `03-MODELO_FISICO.md`/`schema.sql` (regenerar via `pg_dump`) e
`04-DICIONARIO_DADOS.md` (regenerar via `docs/database/gen_dict.py` — ver
nota no topo desse arquivo).

> ## ⚠️ Correção global — 2026-08-10 (auditoria de consistência da cadeia do produto)
>
> **Todas as 150 migrations do repositório estão aplicadas** ao banco
> `erp_evok_audio` (`SELECT count(*) FROM "SequelizeMeta"` = 150 = número de
> arquivos em `server/migrations/`), incluindo `20260809-000026` e
> `20260809-000027`. Onde este documento (e `DATABASE.md`, e os
> `docs/business/BLOCO_*_MODELO_DADOS.md`) diz que as migrations de
> SST/TI/Jurídico/Facilities/Marketing/RH, do G3 ou do G14 estão
> "criadas, **não aplicadas**, aguardando aprovação do dono", **a informação
> está desatualizada** — elas já foram aplicadas. Os números de
> "auditoria de origem" abaixo (80 tabelas, 175 FKs, 66 migrations) também
> estão desatualizados: hoje são **195 tabelas** e **150 migrations**.
>
> Ver `docs/governance/auditorias/AUDITORIA_CONSISTENCIA_CADEIA_PRODUTO_2026-08-10.md`
> (achado **P2-09**).

**Auditoria de origem:** 2026-08-06, introspecção real do PostgreSQL 16
local (81 tabelas incl. `SequelizeMeta`, 80 tabelas de negócio, 175
foreign keys, 66 migrations aplicadas) — não apenas leitura de código/models.
**Reconferido no mesmo dia** (rodada pós-módulo COMEX/Importação,
migration `20260806-000090-create-import-processes.cjs`): schema.sql,
dicionário e contagem de migrations batem 1:1 com o banco real; achado de
nomenclatura isolado (`access_profiles.nome`/`descricao`) registrado em
[04-DICIONARIO_DADOS.md](04-DICIONARIO_DADOS.md#accessprofiles) e
[03-MODELO_FISICO.md](03-MODELO_FISICO.md).

## Os 7 documentos

1. **[01-MODELO_CONCEITUAL.md](01-MODELO_CONCEITUAL.md)** — Modelo
   Entidade-Relacionamento (MER) de negócio: entidades e relações, sem
   tecnologia. Nível "validar com a diretoria".
2. **[02-MODELO_LOGICO.md](02-MODELO_LOGICO.md)** — DER técnico (Mermaid
   `erDiagram`): tabelas, PKs, FKs, cardinalidade, cobrindo os módulos
   principais (Item, Fornecedor, Venda, OP, Requisição/Pedido de Compra,
   Financeiro, RFQ, Centros de Custo, COMEX/Importação etc.).
3. **[03-MODELO_FISICO.md](03-MODELO_FISICO.md)** — Como o DDL real é
   gerado e mantido; aponta para `schema.sql` (anexo, `pg_dump
   --schema-only` do banco local real).
4. **[04-DICIONARIO_DADOS.md](04-DICIONARIO_DADOS.md)** — Catálogo
   coluna-a-coluna de todas as 80 tabelas (tipo, nulabilidade, default,
   PK/FK/UNIQUE), gerado por introspecção real + descrição de negócio
   curada para as tabelas ativas.
5. **[05-ACESSOS_E_ISOLAMENTO.md](05-ACESSOS_E_ISOLAMENTO.md)** — Matriz
   de privilégios (realidade atual: usuário único superusuário) e
   política de isolamento de serviços externos (n8n, integrações).
6. **[06-ESTRUTURAS_PROGRAMAVEIS.md](06-ESTRUTURAS_PROGRAMAVEIS.md)** —
   Procedures/functions/triggers (confirmado: nenhum no banco; decisão
   arquitetural documentada).
7. **[07-DISASTER_RECOVERY.md](07-DISASTER_RECOVERY.md)** — Rotinas de
   backup (realidade vs aspiracional) e processo de restore.

## Anexo

- **[schema.sql](schema.sql)** — DDL completo (`pg_dump --schema-only
  --no-owner --no-privileges`) do banco local real em 2026-08-06. Não
  editar manualmente; regenerar a cada mudança relevante de schema (ver
  comando em `03-MODELO_FISICO.md`).

## Pendências de aplicação

- **Módulo SST (BLOCO 1, departamento 15)** — 12 migrations preparadas em
  `server/migrations/20260806-000130-*.cjs` a `20260806-000141-*.cjs` (34
  tabelas novas + extensão do ENUM `inventory_movements.reference_type` +
  chave `sst` em `accessModules.ts`), **ainda não aplicadas**
  (`migration:up` pendente de aprovação do dono do produto, após revisão
  do `AuditorIntegrador`). Modelo de dados completo, decisões de
  imutabilidade/retenção e rastreabilidade RF→tabela em
  [`docs/business/BLOCO_1_SST_MODELO_DADOS.md`](../business/BLOCO_1_SST_MODELO_DADOS.md).
  `02-MODELO_LOGICO.md`/`04-DICIONARIO_DADOS.md` **não foram atualizados**
  com essas tabelas (ambos refletem o schema real introspectado do banco
  aplicado, por convenção desta pasta) — atualizar somente depois de
  `migration:up`.
  **Atualização 2026-08-07 (implementação backend, P0):** os 14 models
  Sequelize (`server/src/models/Sst*.ts`) e o módulo Clean Architecture
  `server/src/modules/sst/` (EPI, ASO/PCMSO, Acidente/CAT, fila eSocial —
  P0 de `docs/business/BLOCO_1_SST_REQUISITOS.md`) já foram implementados
  e **apontam para o schema das migrations acima, que continuam
  pendentes de `migration:up`** — o código não altera essa pendência, só
  a antecipa. Ver changelog narrativo em `DATABASE.md` (seção "BLOCO 1 SST
  — Implementação Backend, 2026-08-07") e
  `docs/governance/HANDOFF_CODEX.md`.
- **Módulo Jurídico (BLOCO 3, departamento 16)** — 12 migrations
  preparadas em `server/migrations/20260807-000260-*.cjs` a
  `20260807-000271-*.cjs` (16 tabelas novas — `jur_contracts` e satélites,
  `jur_legal_cases`/`jur_legal_case_events`/`jur_legal_case_deadlines`/
  `jur_legal_case_provisions`, `jur_legal_alerts`, `jur_external_lawyers`,
  `jur_proxies`, `jur_intellectual_property`/`jur_ip_contract_links`,
  cluster LGPD `jur_lgpd_*` — mais 2
  colunas novas em `accounts_payable` e a chave `juridico` em
  `accessModules.ts`), **ainda não aplicadas** (`migration:up` pendente de
  aprovação do dono do produto, após revisão do `AuditorIntegrador`).
  Modelo de dados completo, decisões de imutabilidade/retenção e
  rastreabilidade RF→tabela em
  [`docs/business/BLOCO_3_JUR_MODELO_DADOS.md`](../business/BLOCO_3_JUR_MODELO_DADOS.md).
  `02-MODELO_LOGICO.md`/`04-DICIONARIO_DADOS.md` **não foram atualizados**
  com essas tabelas (ambos refletem o schema real introspectado do banco
  aplicado, por convenção desta pasta) — atualizar somente depois de
  `migration:up`.
- **Módulo Marketing (BLOCO 5, correção, departamento 14)** — 6 migrations
  preparadas em `server/migrations/20260807-000310-*.cjs` a
  `20260807-000315-*.cjs` (2 tabelas novas — `marketing_events`,
  `marketing_event_checklist_items` — mais a tabela de auditoria
  `marketing_lead_saneamento_log`; extensão do ENUM
  `marketing_leads.status` com `in_sales_attendance`; colunas novas de
  handoff/LGPD/saneamento em `marketing_leads`, de orçamento/aprovação/
  métricas em `marketing_campaigns` e de vínculo com Almoxarifado/
  aprovação em `marketing_materials`; 5 novas `CHECK` constraints),
  **ainda não aplicadas** (`migration:up` pendente de aprovação do dono do
  produto, após revisão do `AuditorIntegrador`). Corrige gaps críticos
  identificados em `docs/business/BLOCO_5_MKT_VERIFICACAO.md` (conversão
  lead→cliente não obrigatória no banco, métricas de campanha editáveis,
  ausência de handoff/evento/consentimento LGPD). Modelo de dados
  completo, decisões de saneamento/retenção e rastreabilidade RF→tabela
  em
  [`docs/business/BLOCO_5_MKT_MODELO_DADOS.md`](../business/BLOCO_5_MKT_MODELO_DADOS.md).
  `02-MODELO_LOGICO.md`/`04-DICIONARIO_DADOS.md` **não foram atualizados**
  com essas tabelas/colunas (ambos refletem o schema real introspectado do
  banco aplicado, por convenção desta pasta) — atualizar somente depois de
  `migration:up`.

- **Módulo RH (BLOCO 6, departamento 02, último bloco do pipeline)** — 16
  migrations preparadas em `server/migrations/20260808-000010-*.cjs` a
  `20260808-000025-*.cjs` (18 tabelas novas — `hr_job_positions`,
  `hr_job_vacancies`/`hr_candidates`, `hr_employee_job_history`,
  `hr_employee_contracts`, `hr_admission_processes`,
  `hr_termination_processes`, `hr_employee_documents`,
  `hr_vacation_accrual_periods`/`hr_vacation_schedules`, `hr_absences`,
  `hr_benefit_types`/`hr_employee_benefits`, `hr_training_courses`/
  `hr_job_position_trainings`/`hr_employee_trainings`,
  `hr_time_sheet_summaries`, `hr_payroll_import_batches`/
  `hr_payroll_import_items`, `hr_performance_reviews` — mais `pcd`/
  `job_position_id` em `employees` e 5 triggers de imutabilidade), **ainda
  não aplicadas** (`migration:up` pendente de aprovação do dono do produto,
  após revisão do `AuditorIntegrador`). Cobre apenas as lacunas do módulo
  RH (`employees`/`departments` já existentes não são recriados) —
  folha de pagamento e ponto eletrônico são explicitamente BUY/INTEGRAR,
  não modelados aqui além da fronteira de importação. Modelo de dados
  completo, decisões de imutabilidade/retenção e rastreabilidade RF→tabela
  em
  [`docs/business/BLOCO_6_RH_MODELO_DADOS.md`](../business/BLOCO_6_RH_MODELO_DADOS.md).
  `02-MODELO_LOGICO.md`/`04-DICIONARIO_DADOS.md` **não foram atualizados**
  com essas tabelas/colunas (ambos refletem o schema real introspectado do
  banco aplicado, por convenção desta pasta) — atualizar somente depois de
  `migration:up`.

## Auditorias específicas

- **[AUDITORIA_DEPARTAMENTOS_2026-08-06.md](AUDITORIA_DEPARTAMENTOS_2026-08-06.md)**
  — auditoria de espelhamento banco × seed (`server/src/config/seeds.ts`) ×
  docs organizacionais para a tabela `departments`. Achado crítico: a
  tabela `departments` está **vazia** no banco local hoje, apesar do seed
  oficial ter 17 registros; matriz completa de divergência de
  código/nome/sigla entre as 3 fontes e migration de reconciliação
  preparada (não aplicada, pendente de aprovação).

## Relação com `docs/database/DATABASE.md`

`docs/database/DATABASE.md` continua existindo como **changelog histórico
narrativo** de cada migration/decisão de modelagem desde 2026-07-31 (a
"memória" de por que cada tabela existe do jeito que existe). Esta pasta
(`docs/database/`) é a **documentação de referência estruturada e sempre
atual** — comece por aqui se quiser saber "o que existe hoje", vá para
`docs/database/DATABASE.md` se quiser saber "por que foi decidido assim".
