# Documentação de Banco de Dados — ERP EVOK ÁUDIO

**Dono:** DBA/Arquiteto de Dados (`AdmDBA`) — qualquer alteração de schema (nova
migration) DEVE atualizar os arquivos relevantes desta pasta **no mesmo
ciclo de trabalho**, não como tarefa pontual futura. Isso vale sobretudo
para `03-MODELO_FISICO.md`/`schema.sql` (regenerar via `pg_dump`) e
`04-DICIONARIO_DADOS.md` (regenerar via `docs/database/gen_dict.py` — ver
nota no topo desse arquivo).

> ## ⚠️ Correção global — 2026-08-10, reconferida em 2026-08-12
>
> **Todas as migrations do repositório estão aplicadas** ao banco
> `erp_evok_audio` (`SELECT count(*) FROM "SequelizeMeta"` = número de arquivos
> em `server/migrations/`), incluindo `20260809-000026` e `20260809-000027`.
> Onde este documento (e `DATABASE.md`, e os
> `docs/business/BLOCO_*_MODELO_DADOS.md`) diz que as migrations de
> SST/TI/Jurídico/Facilities/Marketing/RH, do G3 ou do G14 estão
> "criadas, **não aplicadas**, aguardando aprovação do dono", **a informação
> está desatualizada** — elas já foram aplicadas e estão no baseline congelado
> (`server/database/postgresql/00_baseline_frozen.sql`).
>
> **Medição canônica de 2026-08-12** (contagem direta no PostgreSQL, não
> estimativa). Este é um dos **dois** pontos canônicos do projeto — o outro é
> o `CLAUDE.md` §1. A guarda
> `server/tests/integration/docs-reality-drift-guard.test.ts` confere o número
> de migrations dos dois contra `SequelizeMeta`; não reescreva o marcador
> "Medição canônica" nem o rótulo "Migrations aplicadas" da tabela sem ajustar
> a guarda:
>
> | Métrica | Valor |
> |---|---|
> | Migrations aplicadas | **169** |
> | Tabelas (`information_schema.tables`, schema `public`) | **207** |
> | Foreign keys (`pg_constraint`, `contype='f'`) | **478** |
> | Tabelas `sst_*` | 35 |
> | Tabelas `jur_*` | 18 |
> | Tabelas `marketing_*` | 6 |
> | Tabelas `hr_*` | 22 |
> | Tabelas `facility_*` | 13 |
> | Registros em `departments` | 17 |
>
> A 168ª é `20260812-000046-create-directorate-governance.cjs` (módulo
> Diretoria — Planejamento Estratégico, Atas de Reunião e Riscos
> Corporativos), que acrescentou 3 tabelas (`strategic_plannings`,
> `meeting_minutes`, `business_risks`) e 7 foreign keys novas. A 169ª é
> `20260812-000047-hr-absences-open-unique.cjs` (achado de auditoria de
> arquitetura — índice único parcial em `hr_absences`, sem tabela/FK nova).
>
> Os números de "auditoria de origem" abaixo (80 tabelas, 175 FKs, 66
> migrations) são de 2026-08-06 e ficam **apenas como registro histórico** —
> use a tabela acima.
>
> Ver `docs/governance/auditorias/AUDITORIA_CONSISTENCIA_CADEIA_PRODUTO_2026-08-10.md`
> (achado **P2-09**) e a auditoria documental de 2026-08-11.

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

## Outros documentos desta pasta (não numerados)

- **[DATABASE.md](DATABASE.md)** — changelog histórico narrativo de cada
  migration/decisão de modelagem desde 2026-07-31 (ver última seção deste
  índice). Inclui a seção *"Baseline congelado"*, que explica por que o
  baseline passou a ser DDL estático
  (`server/database/postgresql/00_baseline_frozen.sql`) em vez de gerado a
  partir dos models.
- **[DATABASE_SETUP.md](DATABASE_SETUP.md)** — procedimento prático de
  provisionamento do banco local (Docker, criação dos dois bancos
  `erp_evok_audio` e `erp_evok_audio_test`, aplicação de migrations e seed).
- **[INVENTARIO_SCHEMA_G2_2026-07-31.md](INVENTARIO_SCHEMA_G2_2026-07-31.md)**
  — inventário de schema do gate G2 (2026-07-31), mantido como registro
  histórico do ponto de partida da modelagem.

## Histórico de aplicação dos blocos (todos APLICADOS)

> ⚠️ **Esta seção chamava-se "Pendências de aplicação".** Nenhum item abaixo é
> pendência — todos foram aplicados e conferidos no banco em 2026-08-12
> (contagens no banner do topo). O texto original de cada bloco foi mantido
> como registro de escopo (o que cada conjunto de migrations criou), com o
> status corrigido no início de cada item.

- **Módulo SST (BLOCO 1, departamento 15)** — `[APLICADO]` **35 tabelas
  `sst_*` no banco em 2026-08-12**, presentes no baseline congelado. 12
  migrations em
  `server/migrations/20260806-000130-*.cjs` a `20260806-000141-*.cjs` (34
  tabelas novas + extensão do ENUM `inventory_movements.reference_type` +
  chave `sst` em `accessModules.ts`). Modelo de dados completo, decisões de
  imutabilidade/retenção e rastreabilidade RF→tabela em
  [`docs/business/BLOCO_1_SST_MODELO_DADOS.md`](../business/BLOCO_1_SST_MODELO_DADOS.md).
  `02-MODELO_LOGICO.md`/`04-DICIONARIO_DADOS.md` **não foram atualizados**
  com essas tabelas (ambos refletem o schema real introspectado do banco
  aplicado, por convenção desta pasta) — atualizar somente depois de
  `migration:up`.
  **Atualização 2026-08-07 (implementação backend, P0):** os 14 models
  Sequelize (`server/src/models/Sst*.ts`) e o módulo Clean Architecture
  `server/src/modules/sst/` (EPI, ASO/PCMSO, Acidente/CAT, fila eSocial —
  P0 de `docs/business/BLOCO_1_SST_REQUISITOS.md`) foram implementados e
  apontam para esse schema — **hoje aplicado**. Ver changelog narrativo em
  `DATABASE.md` (seção "BLOCO 1 SST — Implementação Backend, 2026-08-07") e
  `docs/governance/HANDOFF_CODEX.md`.
- **Módulo Jurídico (BLOCO 3, departamento 16)** — `[APLICADO]` **18 tabelas
  `jur_*` no banco em 2026-08-12**. 12 migrations
  em `server/migrations/20260807-000260-*.cjs` a
  `20260807-000271-*.cjs` (16 tabelas novas — `jur_contracts` e satélites,
  `jur_legal_cases`/`jur_legal_case_events`/`jur_legal_case_deadlines`/
  `jur_legal_case_provisions`, `jur_legal_alerts`, `jur_external_lawyers`,
  `jur_proxies`, `jur_intellectual_property`/`jur_ip_contract_links`,
  cluster LGPD `jur_lgpd_*` — mais 2
  colunas novas em `accounts_payable` e a chave `juridico` em
  `accessModules.ts`).
  Modelo de dados completo, decisões de imutabilidade/retenção e
  rastreabilidade RF→tabela em
  [`docs/business/BLOCO_3_JUR_MODELO_DADOS.md`](../business/BLOCO_3_JUR_MODELO_DADOS.md).
  `02-MODELO_LOGICO.md`/`04-DICIONARIO_DADOS.md` **não foram atualizados**
  com essas tabelas (ambos refletem o schema real introspectado do banco
  aplicado, por convenção desta pasta) — atualizar somente depois de
  `migration:up`.
- **Módulo Marketing (BLOCO 5, correção, departamento 14)** — `[APLICADO]`
  **6 tabelas `marketing_*` no banco em 2026-08-12**. 6 migrations
  em `server/migrations/20260807-000310-*.cjs` a
  `20260807-000315-*.cjs` (2 tabelas novas — `marketing_events`,
  `marketing_event_checklist_items` — mais a tabela de auditoria
  `marketing_lead_saneamento_log`; extensão do ENUM
  `marketing_leads.status` com `in_sales_attendance`; colunas novas de
  handoff/LGPD/saneamento em `marketing_leads`, de orçamento/aprovação/
  métricas em `marketing_campaigns` e de vínculo com Almoxarifado/
  aprovação em `marketing_materials`; 5 novas `CHECK` constraints).
  Corrige gaps críticos
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

- **Módulo RH (BLOCO 6, departamento 02, último bloco do pipeline)** —
  `[APLICADO]` **20 tabelas `hr_*` no banco em 2026-08-12**. 16
  migrations em `server/migrations/20260808-000010-*.cjs` a
  `20260808-000025-*.cjs` (18 tabelas novas — `hr_job_positions`,
  `hr_job_vacancies`/`hr_candidates`, `hr_employee_job_history`,
  `hr_employee_contracts`, `hr_admission_processes`,
  `hr_termination_processes`, `hr_employee_documents`,
  `hr_vacation_accrual_periods`/`hr_vacation_schedules`, `hr_absences`,
  `hr_benefit_types`/`hr_employee_benefits`, `hr_training_courses`/
  `hr_job_position_trainings`/`hr_employee_trainings`,
  `hr_time_sheet_summaries`, `hr_payroll_import_batches`/
  `hr_payroll_import_items`, `hr_performance_reviews` — mais `pcd`/
  `job_position_id` em `employees` e 5 triggers de imutabilidade).
  Cobre apenas as lacunas do módulo
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
  preparada.
  ⚠️ **RESOLVIDO — não leia o achado acima como estado atual.** Em 2026-08-12
  a tabela `departments` tem **17 registros** no banco. A hierarquia saiu do
  documento e passou a existir no banco (commit `ec54e41`, gaps F-6/F-7), e a
  guarda `client/src/lib/departments.seeds.test.ts` reprova se
  `server/src/config/seeds.ts`, `client/src/lib/departments.ts` e
  `docs/administrativo/05-ORGANOGRAMA_EXECUTIVO.md` divergirem.

## Relação com `docs/database/DATABASE.md`

`docs/database/DATABASE.md` continua existindo como **changelog histórico
narrativo** de cada migration/decisão de modelagem desde 2026-07-31 (a
"memória" de por que cada tabela existe do jeito que existe). Esta pasta
(`docs/database/`) é a **documentação de referência estruturada e sempre
atual** — comece por aqui se quiser saber "o que existe hoje", vá para
`docs/database/DATABASE.md` se quiser saber "por que foi decidido assim".
