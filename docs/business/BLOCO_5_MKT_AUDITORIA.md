# BLOCO 5 (CORREÇÃO) — Módulo Marketing (MKT) — Auditoria Cruzada Requisito ↔ Banco ↔ API

**Departamento:** 14 — Marketing.
**Escopo:** auditoria cruzada documento-contra-documento entre
`docs/business/BLOCO_5_MKT_REQUISITOS.md` (40 RF-MKT, UC-63 a UC-66),
`docs/business/BLOCO_5_MKT_MODELO_DADOS.md` + 6 migrations
(`server/migrations/20260807-000310` a `000315`) e
`docs/business/BLOCO_5_MKT_API.md` (27 endpoints). Não é auditoria de
código real implementado — o `programador` ainda não tocou o módulo nesta
correção; código atual (`server/src/modules/marketing/`) foi usado apenas
como referência de nomes/estruturas já em produção.
**Autor:** `AuditorIntegrador`.
**Data:** 2026-08-07.

---

## Relatório de Auditoria Cruzada — Bloco 5 MKT (correção)

**Status:** [REPROVADO COM RESSALVAS] — 6 inconsistências reais
encontradas, **todas corrigidas nesta passada** (nos 3 artefatos e em 1
migration), mais riscos residuais que ficam registrados como pendência
(não bloqueiam o handoff para `programador`, mas exigem decisão/ação
antes ou logo depois da implementação). Não uso `[APROVADO]` porque a
migration `000312` (a mais delicada do bloco) tem um risco de negócio
declarado e não mitigável neste passo (ver avaliação de risco abaixo), e
porque a auditoria de nomenclatura, embora sistemática, não cobriu
`client/` (nenhuma tela ainda existe para este bloco — fora do escopo
desta passada, que é banco↔API↔requisito).

### Rastreabilidade verificada

| RF-MKT | Tabela(s) | Endpoint(s) | Status |
|---|---|---|---|
| 001-004 (conversão atômica) | `marketing_leads.converted_to_customer_id`, `converted_at` (adicionada nesta auditoria) + CHECK `ck_marketing_leads_converted_requires_client` (`000312`) | `POST /leads/:id/convert` | OK após correção de nome e de coluna faltante |
| 005 (funil `in_sales_attendance`) | `enum_marketing_leads_status` (`000310`) | `POST /leads/:id/status` | OK |
| 006-009 (métricas cache) | `marketing_campaigns.metrics_recalculated_at` (`000314`) | `PUT`/`POST /campaigns`, `POST /campaigns/:id/recalculate-metrics` | OK |
| 010 (janela de atribuição) | Constante de aplicação, sem coluna | `POST /campaigns/:id/recalculate-metrics`, `GET /reports/funnel` | OK (fora de escopo de schema, declarado) |
| 011-013 (handoff) | `marketing_leads.qualified_at`/`sales_owner_user_id`/`handoff_at`/`first_response_at` (`000310`) | `POST /leads/:id/status`, `POST /leads/:id/handoff` | OK após correção de nome (RF usa `responsible_sales_user_id`/`sales_handoff_at`; banco/API usam `sales_owner_user_id`/`handoff_at` — divergência já estava documentada corretamente em `MODELO_DADOS.md` §0; `API.md` não estava alinhado e foi corrigido) |
| 014 (SLA) | Índice `idx_marketing_leads_status_qualified_at` (`000310`) | `GET /leads?sla_breached=true`, `GET /reports/funnel` | OK |
| 015 (RBAC dupla marketing/vendas) | — | `POST /leads/:id/handoff` | OK após correção (módulo `sales` não existe no RBAC; nome correto é `vendas`; middleware `authorizeAnyModule` já existe, não é pendência de infra) |
| 016-019 (dedup/lote) | Sem tabela nova | `POST /leads`, `POST /leads/bulk` | OK |
| 020-021 (evento/checklist) | `marketing_events`, `marketing_event_checklist_items` (`000313`) | `POST /events`, `POST /events/:id/checklist`, `PUT /events/:id/checklist/:itemId` | OK |
| 022 (event_id/lead_source) | CHECK `ck_marketing_leads_event_requires_event_source` (`000313`) | `POST /leads` | OK |
| 023-024 (contagem/custo por lead) | Derivado em leitura, sem coluna | `GET /events/:id` | OK |
| 025 (fechamento exige actual_cost) | CHECK `ck_marketing_events_completed_requires_actual_cost` (`000313`) | `POST /events/:id/close` | OK |
| 026-029 (KPIs de funil) | Sem tabela nova, agregação | `GET /reports/funnel`, `GET /reports/events` | OK, mas `SalesRevenueService` do contrato usava `client_id` (coluna inexistente em `Sale`); corrigido para `customer_id` |
| 030-031 (orçamento/aprovação) | `marketing_campaigns.budget_requested`/`budget_approved`/`budget_approval_status`/`budget_approved_by`/`budget_approved_at` + CHECK (`000314`) | `POST`/`PUT /campaigns`, `POST /campaigns/:id/budget-decision` | OK |
| 032-033 (alerta de orçamento) | Derivado em leitura, sem coluna | `GET /campaigns` | OK |
| 034 (imutabilidade pós-conclusão) | `marketing_campaigns.notes` (`000314`) | `PUT /campaigns/:id` | OK |
| 035-036 (consentimento LGPD) | `marketing_leads.consent_given`/`consent_date`/`consent_channel` (`000311`) | `POST /leads` | OK |
| 037 (expurgo LGPD) | Fora de escopo (P3) | Fora de escopo | OK — pendência explícita em ambos os documentos |
| 038 (material×estoque) | `marketing_materials.stock_item_id` (`000315`) | `POST`/`PUT /materials` | OK |
| 039-040 (aprovação de material) | `marketing_materials.approved_by`/`approved_at` (`000315`) | `PATCH /materials/:id/approve`, `POST /materials/:id/file` | OK |
| §2 (saneamento) | `marketing_lead_saneamento_log`, `marketing_leads.needs_review` (`000312`) | `GET /leads?data_issue_flag=true` | OK |

Todos os 40 RF-MKT têm rastro fechado nos 3 documentos após as correções
abaixo — nenhum RF ficou sem tabela ou sem endpoint correspondente
(cobertura total, não amostral: cada linha da tabela acima foi conferida
contra o texto real da migration/model, não contra a descrição do
`ArquitetoSoftwareAPI` de segunda mão).

---

### Inconsistências encontradas (todas corrigidas nesta passada)

1. **`docs/business/BLOCO_5_MKT_API.md`, §3 (tabela de breaking changes) e
   mais 6 ocorrências (`converted_client_id`)** — o contrato de API
   renomeava `converted_to_customer_id` para `converted_client_id` no
   payload, contradizendo a decisão explícita do `AdmDBA`
   (`BLOCO_5_MKT_MODELO_DADOS.md` §0) de **manter** o nome já em produção
   (coluna com FK/índice ativos desde `20260807-000210`). Era exatamente o
   tipo de divergência de nome entre camadas apontado como esperado.
   - Ação corretiva aplicada: todas as ocorrências de `converted_client_id`
     em `BLOCO_5_MKT_API.md` substituídas por `converted_to_customer_id`;
     a linha da tabela de breaking changes foi reescrita para deixar
     explícito que o nome **não muda**.
   - Responsável: `AuditorIntegrador` (corrigido diretamente).

2. **`docs/business/BLOCO_5_MKT_API.md`, §2 (interface `ClientService`) e
   §4 (handoff, ~11 ocorrências) — `responsible_sales_user_id`/
   `sales_handoff_at`** — o contrato de API usava os nomes conceituais do
   documento de requisitos (`RF-MKT-011`/`013`) em vez dos nomes reais
   decididos pelo `AdmDBA` na migration `000310`
   (`sales_owner_user_id`/`handoff_at`). `MODELO_DADOS.md` §0 já
   documentava a divergência corretamente (RF ≠ coluna real por decisão
   consciente), mas o `ArquitetoSoftwareAPI` não seguiu essa tabela ao
   escrever os payloads.
   - Ação corretiva aplicada: `responsible_sales_user_id` →
     `sales_owner_user_id` e `sales_handoff_at` → `handoff_at` em todo
     `BLOCO_5_MKT_API.md` (query params, request/response bodies, tabelas
     de erro, rastreabilidade).
   - Responsável: `AuditorIntegrador` (corrigido diretamente).

3. **`docs/business/BLOCO_5_MKT_API.md`, §4.5 e §10.5 — middleware
   `authorizeAnyModule` descrito como "a criar"** — o contrato afirmava
   que `POST /leads/:id/handoff` "requer o mesmo middleware de composição
   OR já sinalizado como pendência de infraestrutura no Bloco 4 FAC (...)
   `programador` precisa criar o composto antes de implementar esta
   rota". Isso é falso: `server/src/middlewares/authorizeAnyModule.ts`
   **já existe**, criado durante o próprio Bloco 4 FAC (confirmado por
   leitura direta do arquivo, com assinatura
   `authorizeAnyModule(candidates: AnyModuleCandidate[])` pronta para uso
   com curto-circuito OR, nível `approve`/`operate` e auditoria de
   `access_denied`).
   - Ação corretiva aplicada: §4.5 e §10.5 reescritos para referenciar o
     middleware existente e orientar o `programador` a apenas importá-lo,
     não implementá-lo.
   - Responsável: `AuditorIntegrador` (corrigido diretamente).

4. **`docs/business/BLOCO_5_MKT_API.md`, §4.5, §9 (rastreabilidade), §10.5
   — chave de RBAC `'sales'`** — o contrato modelava a RBAC dupla do
   handoff como `authorizeModule('marketing', 'operate')` **OU**
   `authorizeModule('sales', 'operate')`. **`'sales'` não é uma chave
   válida do catálogo RBAC** — `server/src/shared/domain/accessModules.ts`
   não tem essa chave; o módulo de Vendas usa a chave `vendas` (confirmado
   por `authorizeModule('vendas', ...)` em
   `server/src/modules/sales/presentation/routes/sales.ts` e pela lista
   completa de `AccessModuleKey` no catálogo). Se implementado como
   escrito, a rota teria ficado inacessível a qualquer perfil de Vendas
   (chave inexistente nunca teria permissão setada).
   - Ação corretiva aplicada: `authorizeModule('sales', ...)` substituído
     por `authorizeAnyModule([{ moduleKey: 'marketing', ... }, { moduleKey:
     'vendas', ... }])` em §4.5, §9 e §10.5.
   - Responsável: `AuditorIntegrador` (corrigido diretamente).

5. **`docs/business/BLOCO_5_MKT_API.md`, §2 (`SalesRevenueServiceAdapter`)
   — `client_id` em `Sale`** — o contrato descrevia a agregação de
   receita atribuída como `SUM(sales.total_amount) ... WHERE client_id IN
   (:clientIds)`. Conferido `server/src/models/Sale.ts`: a coluna real é
   `customer_id` (`comment: 'FK → clients.id'`); `client_id` não existe em
   `Sale`. Se implementado ao pé da letra, o adapter teria gerado SQL
   inválido (coluna inexistente).
   - Ação corretiva aplicada: §2 reescrito para `customer_id`, com nota
     explícita da correção e do porquê.
   - Responsável: `AuditorIntegrador` (corrigido diretamente).

6. **`docs/business/BLOCO_5_MKT_API.md` (UC-63, resposta de
   `POST /leads/:id/convert`, RF-MKT-026 `median_lead_cycle_days`) —
   campo `converted_at` sem coluna correspondente** — o contrato de API
   promete `converted_at` no payload de resposta da conversão e o usa como
   base do KPI de ciclo de lead, mas **nenhuma migration nem o modelo de
   dados tinha essa coluna** (confirmado: nem em
   `20260807-000210-create-marketing-module.cjs`, nem nas 6 migrations
   novas, nem em `server/src/models/MarketingLead.ts`). Gap real de
   schema — API prometendo dado que o banco não sustentava.
   - Ação corretiva aplicada: coluna `converted_at` (TIMESTAMPTZ,
     nullable) adicionada à migration `20260807-000312` (mesma migration
     que já mexe no ciclo de vida da conversão), com `node -c` validado;
     `down()` atualizado para removê-la; `BLOCO_5_MKT_MODELO_DADOS.md`
     atualizado (MER + §3.2b nova + tabela de rastreabilidade §8). Sem
     backfill retroativo — não há como inferir o instante exato de
     conversões passadas; populada apenas para conversões novas, pela
     aplicação (`ConvertLeadUseCase`, fora do escopo desta migration).
   - Responsável: `AuditorIntegrador` (corrigido diretamente na migration
     e nos dois documentos).

---

### Avaliação de risco da migration `20260807-000312` (a mais delicada do bloco)

**Ordem de execução dentro do arquivo — CONFERIDA, correta:** 1) cria
`marketing_lead_saneamento_log`, 2) adiciona `converted_at`/`needs_review`
em `marketing_leads`, 3) grava o log dos leads afetados (com `status`
ainda `'converted'` no momento do INSERT), 4) só então executa o `UPDATE`
que rebaixa para `qualified`, 5) só então adiciona a `CHECK` constraint. A
ordem é a correta e necessária — inverter 3/4 perderia o `previous_status`
real no log (o `UPDATE` já teria mudado o dado); inverter 4/5 quebraria a
migration num banco com dado órfão real (a `CHECK` rejeitaria linhas que
ainda não foram saneadas).

**Idempotência — CONFIRMADA por leitura do SQL, não apenas pela
documentação:** rodar a migration duas vezes seguidas não duplica log nem
quebra:
- A tabela de log e as colunas novas (`converted_at`, `needs_review`) são
  todas guardadas por `if (!tables.includes(...))`/`if (!columns.x)` —
  seguro.
- O `INSERT INTO marketing_lead_saneamento_log ... SELECT ... FROM
  marketing_leads WHERE status = 'converted' AND
  converted_to_customer_id IS NULL` depende do `WHERE`, não de um guard
  explícito — mas como o passo 4 já rebaixou esses mesmos leads para
  `status = 'qualified'` na primeira execução, a segunda execução do
  `SELECT` não encontra nenhuma linha remanescente com esse critério (a
  menos que um novo lead tenha sido corrompido no intervalo entre as duas
  execuções, o que seria um novo caso legítimo a sanear, não uma
  duplicata). **Idempotente de fato, não só por design.**
- A `CHECK` constraint é guardada por `SELECT conname FROM pg_constraint
  WHERE conname = '...'` antes do `ADD CONSTRAINT` — segura.

**Transação — GAP REAL ENCONTRADO E CORRIGIDO:** a versão original desta
migration executava os 5 passos **fora de qualquer transação explícita**
(`sequelize-cli db:migrate` não envolve `up()` em transação
automaticamente — confirmado por ausência de `sequelize.transaction` no
arquivo original e por grep no restante do projeto, que mostra apenas 2
das ~300 migrations existentes usando transação explícita). Como nenhum
passo desta migration específica usa `ALTER TYPE ... ADD VALUE` (a
restrição "fora de transação" pertence à migration `000310`, não a esta),
não havia impedimento técnico real para envolver tudo numa transação
única — **corrigido nesta auditoria**
(`queryInterface.sequelize.transaction(async (transaction) => {...})`
envolvendo os 5 passos, com `{ transaction }` passado a cada chamada).
Antes da correção, uma falha do processo entre o `UPDATE` (passo 4) e o
`ADD CONSTRAINT` (passo 5) — ex. crash do Node, timeout de conexão —
deixaria o banco com os leads já rebaixados mas sem a constraint aplicada;
não corromperia dado (a idempotência dos passos 3/4 cobre um retry
seguro), mas deixava uma janela de inconsistência evitável.

**Risco de negócio residual — DECLARADO PELO PRÓPRIO `AdmDBA`, não
mitigável nesta auditoria (decisão de negócio, não técnica):** a migration
rebaixa TODO lead `converted` órfão para `qualified`/`needs_review=true`,
tratando igualmente um erro de operação recente (baixo risco de reabrir) e
uma venda fechada há meses (alto risco de reabrir trabalho comercial já
encerrado e gerar confusão com a equipe de Vendas). O schema não tem
histórico de status (`marketing_lead_status_history` não existe), então
não há como diferenciar os dois casos automaticamente. Confirmo a
avaliação do `AdmDBA`: este é o risco real do bloco e não foi mitigado —
não há remediação técnica possível sem a decisão de negócio pendente
(`[VERIFICAR COM MARKETING]`, §2 do documento de requisitos) e sem
histórico de status retroativo (que não existe para inferir). A migration
já faz o mínimo razoável dado a limitação (log permanente + flag de
triagem `needs_review`), mas **antes de rodar em qualquer banco com dado
real de Marketing**, o volume afetado precisa ser contado e revisado por
alguém do time (nem o `AdmDBA` nem esta auditoria tiveram acesso a um
banco com dado real do módulo — o `console.log` de contagem só será
visível na primeira execução real).

**Veredito da migration `000312` isoladamente: aprovada tecnicamente após
a correção de transação; o risco de negócio permanece aberto e é do dono
do produto, não de engenharia.**

---

### Riscos de segurança/isolamento observados

Nenhum novo. O padrão de isolamento (nenhum serviço externo com acesso
direto ao banco, `ClientService`/`SalesRevenueService` como adapters
injetados em vez de import direto de outro módulo) é consistente entre
`MODELO_DADOS.md` e `API.md` — reaproveita o precedente já auditado do
Bloco 4 FAC (`MaintenanceOrderServiceAdapter`). RBAC `approve` pontual
(orçamento/material) está consistente entre o contrato de API e as
colunas de auditoria (`budget_approved_by`/`approved_by`) nas migrations
`000314`/`000315` — nenhuma divergência encontrada aqui.

Um ponto de atenção não-bloqueante: o RBAC dupla de `POST
/leads/:id/handoff` (correção 4 acima) expõe esse endpoint tanto a
`marketing` quanto a `vendas` — isso é a intenção deliberada de RF-MKT-015
(vendedor aceitar/reatribuir o próprio handoff), não um vazamento. Fica
registrado só para reforçar que a correção de nome (`vendas`, não
`sales`) é funcionalmente necessária, não cosmética: sem ela, a intenção
de RF-MKT-015 simplesmente não funcionaria (perfil de Vendas nunca teria
a chave `sales` no seu `permissions`).

---

### Cobertura desta auditoria (checklist de autoavaliação)

- [x] Rastreabilidade total Requisito → Banco → API verificada para os 40
      RF-MKT (não amostral — tabela completa acima).
- [x] Nenhuma regra de negócio do requisito ficou omitida na API ou no
      banco (§2 saneamento, §1.1-1.9 todos com RF↔tabela↔endpoint
      fechados).
- [x] Nomes de campos/entidades comparados sistematicamente por leitura
      direta dos 6 arquivos de migration + 3 models Sequelize + 1
      middleware + `accessModules.ts`, não por memória do conteúdo dos
      documentos.
- [x] Cada inconsistência tem localização exata (arquivo + seção) — ver
      itens 1-6 acima.
- [x] Migrations corrigidas validadas com `node -c` (as 6, após edição).
- [x] Este relatório é referenciado em `docs/governance/TODO.md` (ver
      abaixo) com os riscos residuais reais (não os itens já corrigidos,
      que não geram pendência).
- [ ] **Não coberto nesta passada (registrar como ressalva):**
      `client/` (telas) — não existem ainda para este bloco, fora do
      escopo desta auditoria de documento-documento; validação em banco
      real do volume de leads `converted` órfãos (§3.3 do modelo de
      dados) — só será possível ao rodar a migration `000312` de fato,
      não nesta passada de auditoria estática; e a decisão de negócio
      `[VERIFICAR COM MARKETING]` sobre reabrir vs. flag de exceção
      permanente permanece pendente (não é decisão de engenharia).

---

## Referências

- `docs/business/BLOCO_5_MKT_REQUISITOS.md`
- `docs/business/BLOCO_5_MKT_MODELO_DADOS.md` (corrigido: §3.2b nova, MER
  atualizado, §8 atualizado)
- `docs/business/BLOCO_5_MKT_API.md` (corrigido: §2, §3, §4.5, §5, §9,
  §10)
- `server/migrations/20260807-000312-marketing-leads-conversion-integrity-saneamento.cjs`
  (corrigido: `converted_at` adicionado, transação explícita)
- `server/src/middlewares/authorizeAnyModule.ts` (confirmado existente,
  Bloco 4 FAC)
- `server/src/models/Sale.ts` (confirmado `customer_id`, não `client_id`)
- `server/src/shared/domain/accessModules.ts` (confirmado `vendas`, não
  `sales`)
