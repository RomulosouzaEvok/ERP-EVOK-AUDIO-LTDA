# T-13 — DADOS E SCHEMA · RELATÓRIO DE TRILHA

> **Nota de persistência.** Produzido pelo `vericore-database-auditor` (T-13 dados e schema) e persistido
> **sem alteração de conteúdo** pelo orquestrador — o agente é read-only por
> desenho e não pode escrever em `audit/`. O juízo de auditoria é
> integralmente da trilha. Única transformação aplicada: promoção do
> cabeçalho a H1 e desescape de entidades HTML.

---

```
AUDIT_ID ......... ERP-LEGACY-001-AUD-001
AUDIT_COMMIT ..... c1311a6f76b512fef893f7e60d934179cae3409f
TRILHA ........... T-13 — DADOS E SCHEMA (transversal), onda W2
TITULAR .......... vericore-database-auditor
REGIME ........... APR-2026-016 (read-only reforçado, ZERO conexão de banco)
                   Regra 2 (nenhum arquivo do objeto auditado alterado)
                   Regra 22 (todos os findings saem PROPOSED)
                   G3 (proibida amostragem reduzida em integridade de dados)
OBJETO ........... server/database/postgresql/00_baseline_frozen.sql
                   + 9 migrations pós-congelamento
                   + server/src/models/ (186 arquivos)
DATA ............. 2026-08-14
```

---

### 0. LIMITAÇÃO DE FERRAMENTAL — DECLARADA ANTES DE QUALQUER AFIRMAÇÃO

A ferramenta Bash está **desabilitada** nesta sessão (erro `No such tool available: Bash`). Consequências normativas:

- **IN-08 não pôde ser satisfeito em nenhum ponto.** Nenhum `git log`/`git show` foi executado. **Nenhuma afirmação deste relatório atribui origem temporal de código a commit.** Onde datas aparecem, elas são **citação de texto contido no arquivo** (comentário de migration), nunca inferência de proveniência. Isso vira `RES-T13-01`.
- Toda a análise foi feita com Read/Grep/Glob sobre os arquivos em disco em `c:/Sistema EvokAudio/ERP-Evok--Audio-LTDA/`. Nenhum HEAD/branch de contexto injetado foi usado como fonte.
- Cruzamentos de conjunto (459 FKs × 510 índices) foram feitos por leitura integral das duas listas e confronto manual, não por script. A margem de erro humana está declarada em `RES-T13-02`.

---

### 1. COBERTURA EFETIVA (declarada honestamente)

| Dimensão | Nível planejado | Nível **alcançado** | Evidência |
|---|---|---|---|
| Inventário de tabelas (207) | exaustivo | **exaustivo** | 200 `CREATE TABLE` no baseline + 7 criadas pós-freeze = 207. Reconciliação fechada. |
| PK por tabela | exaustivo | **exaustivo** | 200 `PRIMARY KEY` para 200 tabelas no baseline; 7/7 nas migrations pós-freeze |
| FK (478) | exaustivo | **exaustivo** | 459 no baseline + 19 pós-freeze = 478. Bate com o plano (`AUDIT_PLAN.md:389`) |
| UNIQUE | exaustivo | **exaustivo** | 70 constraints `UNIQUE` + 39 `CREATE UNIQUE INDEX` = 109 declarações |
| Índice por FK | exaustivo | **exaustivo** (459 do baseline) | §4 — 190 FKs sem índice enumeradas nominalmente |
| CHECK | exaustivo (inventário) | **exaustivo (inventário)**; semântica amostral | 97 CHECKs localizados e mapeados por tabela |
| Correspondência model × tabela (186 models) | exaustivo | **exaustivo** | 185 `tableName` + `index.ts` (sem `tableName`) = 186 arquivos |
| **Nulabilidade coluna a coluna nas 207 tabelas** | amostral declarado | **amostral** | ver regra de seleção abaixo |
| Semântica de coluna | amostral declarado | **amostral** | ver regra de seleção abaixo |
| Isolation / locking / transação | — (fora do escopo T-13) | **não coberto** → `RES-T13-04` | |

**Regra de seleção da amostra (registrada conforme exigido pelo plano, `AUDIT_PLAN.md:401-404`):**
a amostra para **semântica de coluna e nulabilidade coluna-a-coluna** = **todas as tabelas tocadas por tier 1 e tier 2**, operacionalizada como as tabelas ancoradas em finding aberto ou em BR-ID `CONFIRMED` do `BR_CATALOG.md`, a saber: `inventory_movements`, `products`, `items`, `lot_controls`, `production_orders`, `purchase_orders`, `bill_of_materials`, `bill_of_material_items`, `accounts_receivable`, `accounts_payable`, `sales`, `sale_items`, `mrp_ordens_planejadas`, `users`, `access_profiles`, `clients`, `suppliers`, `hr_absences`, `serial_numbers`, `production_lot_consumptions`, `production_order_tracking`, `audit_logs`. **Fora dessa lista, a nulabilidade individual das colunas NÃO foi verificada** — é `RES-T13-03`, não uma conformidade silenciosa.

---

### 2. RECONCILIAÇÃO DA FONTE DO SCHEMA (ponto normativo do plano, `AUDIT_PLAN.md:612`)

Confirmo o ponto normativo e o **reproduzo aritmeticamente**:

- `server/database/postgresql/00_baseline_frozen_meta.sql:26-185` lista **160 migrations** aplicadas no congelamento.
- `server/migrations/` contém **169** arquivos `.cjs`.
- Diferença = **9 migrations pós-congelamento**, nominalmente:
  `20260810-000038-bom-phantom-explosion.cjs`, `-000039-sale-lot-shipments-quality-gate.cjs`, `-000040-purchase-order-requester-not-null.cjs`, `-000041-reapply-app-role-privileges.cjs`, `20260811-000043-create-directorates-hierarchy.cjs`, `-000044-lot-blocked-at-quality-gate.cjs`, `20260812-000045-create-hr-time-imports.cjs`, `-000046-create-directorate-governance.cjs`, `-000047-hr-absences-open-unique.cjs`.
- Tabelas criadas pelas 9: `sale_lot_shipments` (`…-000039…cjs:61`), `directorates` (`…-000043…cjs:143`), `hr_time_import_batches` (`…-000045…cjs:40`), `hr_time_import_items` (`…-000045…cjs:80`), `strategic_plannings` / `meeting_minutes` / `business_risks` (`…-000046…cjs:52,142,196`) = **7**.
- **200 + 7 = 207.** O número do plano está correto e a armadilha do `createTable()` está confirmada como armadilha.

**Observação de numeração:** não existe `…-000042-…` em `server/migrations/`. Não é finding (Umzug ordena por nome, não exige contiguidade), mas é registrado porque um gap de numeração é o sintoma clássico de migration removida sem `down` — só o confronto dinâmico decide. Entra em `DYN-T13-01`.

---

### 3. CONFORMIDADES PROVADAS (resultado positivo é resultado)

Registro explícito para que nenhuma dessas vire finding em trilha posterior:

1. **PK universal.** As 200 tabelas do baseline têm exatamente 200 `PRIMARY KEY`. As 7 pós-freeze declaram PK na criação. **Zero tabela sem PK.**
2. **Soft delete: não existe.** `deleted_at` tem **0 ocorrências** no baseline e **0 ocorrências** em `server/src/models/`. Não há `paranoid: true`. Portanto a responsabilidade "filtrar soft delete em toda query" **não se aplica**: exclusão é `DELETE` físico governado por FK. Isso desloca todo o risco para a política de `ON DELETE` — que é onde os findings §5 se concentram.
3. **Dupla identidade `items`(uuid) × `products`(int) tem guarda onde precisa.** `inventory_movements.product_id` é `NOT NULL` e `item_id` nullable (`…frozen.sql:7079-7080`); `production_orders` idem (`:10894`, `:10906`) — o par é "legado obrigatório + novo opcional", coerente. Onde `product_id` **foi tornado nullable** (`inventory_count_items`, migration `20260806-000002`), existe `CONSTRAINT chk_inventory_count_items_product_or_item CHECK` (`…frozen.sql:6865`). **Controle compensatório presente — não reporto falso positivo aqui.**
4. **Tabelas órfãs do schema-fantasma PT têm controle compensatório documentado.** 12 tabelas (`auditoria_eventos`, `entradas_nf`, `entradas_nf_items`, `fornecedores`, `lotes`, `movimentos_estoque`, `numeros_serie`, `ordens_producao`, `requisicao_compra_items`, `requisicoes_compra`, `usuarios`, `webhooks_eventos`) carregam `COMMENT ON TABLE … 'DEPRECATED (2026-08-06)…'` (ex.: `…frozen.sql:5631`, `:14899`) apontando para o teste-guarda `server/tests/unit/no-orphan-pt-schema-tables.test.ts`. **Não são finding.**
5. **BRs de unicidade `CONFIRMED` que o banco de fato impõe:** BR-IAM-017 (`users_email_key`, `…frozen.sql:18491`), BR-IAM-024 (`access_profiles_nome_key`, `:16451`), BR-CAD-001 (`suppliers_cnpj_key`, `:18323`), BR-CAD-007 (`clients_cpf_cnpj_key`, `:16603`), BR-CAD-008 (`items_codigo_key`, `:17283` + `products_code_key`, `:17795`).
6. **Migrations pós-freeze são de qualidade acima da média do repositório.** `…-000040…cjs:54-67` **aborta em voz alta** se houver linha pendente em vez de pular em silêncio; `…-000043…cjs:141,252` usa transação explícita com rollback; `…-000047…cjs:30` usa índice único **parcial** (`WHERE actual_end_date IS NULL`) em vez de coluna nova. Registro como evidência de conformidade.
7. **`bill_of_material_items.is_phantom` existe no schema declarado** (`…-000038…cjs:86-90`, `BOOLEAN NOT NULL DEFAULT false`). A falha apontada por T-11 (projeção de BOM não carrega `is_phantom`) é, portanto, **defeito de código, não de schema** — o banco cumpriu sua parte. Registro para T-11 não atribuir a causa ao banco.

---

### 4. FKs SEM ÍNDICE — ENUMERAÇÃO EXAUSTIVA (G3: sem amostragem)

Método: extração das 459 linhas `ADD CONSTRAINT … FOREIGN KEY (col) REFERENCES …` de `00_baseline_frozen.sql:22247-25912` e das 510 linhas `CREATE [UNIQUE] INDEX … ON public.X USING … (cols)` de `:18586-22149`, mais as 70 constraints `UNIQUE` de `:16451-18571` e as 200 PKs. Uma FK é considerada **coberta** quando sua coluna é a **coluna líder** de algum índice, unique constraint ou PK.

**Resultado: 190 das 459 FKs do baseline (41,4%) não têm índice na coluna de origem.**

Enumeração por tabela (coluna sem índice):

- `accounting_entries`: approved_by, created_by
- `acoustic_test_results`: non_conformity_id, production_order_id, tester_id
- `accounts_payable`: approved_by, purchase_id, supplier_id
- `accounts_receivable`: customer_id, sale_id
- `assets`: department_id, product_id, responsible_id
- `auditoria_eventos`: usuario_id
- `bank_statement_entries`: matched_by
- `bill_of_materials`: approved_by, created_by
- `bill_of_material_items`: alternative_product_id
- `customer_price_lists`: created_by
- `departments`: manager_id
- `employees`: department_id, user_id
- `engineering_projects`: project_manager_id
- `entradas_nf`: recebido_por · `entradas_nf_items`: entrada_nf_id, lote_id
- `facility_cleaning_executions`: executed_by · `facility_cleaning_schedules`: responsible_employee_id
- `facility_drivers`: authorized_by · `facility_fines`: accounts_payable_id
- `facility_resource_reservations`: asset_id, facility_area_id, reserved_by **(tabela sem nenhum índice além da PK)**
- `facility_vehicle_documents`: released_by · `facility_vehicle_trips`: odometer_override_approved_by, requested_by
- `hr_absences`: accrual_period_impact_id, created_by, document_id, s2230_confirmed_by
- `hr_admission_processes`: candidate_id, contract_id, created_by, esocial_s2200_confirmed_by, job_history_id, job_position_id, job_vacancy_id
- `hr_employee_benefits`: created_by · `hr_employee_contracts`: created_by · `hr_employee_documents`: uploaded_by
- `hr_employee_job_history`: created_by, department_id, esocial_event_confirmed_by, job_position_id
- `hr_employee_trainings`: created_by · `hr_job_position_trainings`: training_course_id
- `hr_job_vacancies`: created_by, job_position_id · `hr_payroll_import_batches`: importado_por · `hr_payroll_import_items`: department_id
- `hr_performance_reviews`: reviewer_id · `hr_termination_processes`: concluded_by, created_by, s2299_confirmed_by
- `hr_time_sheet_summaries`: importado_por · `hr_vacation_accrual_periods`: zeroed_from_period_id
- `hr_vacation_schedules`: created_by, superseded_by_id · `import_process_approvals`: approver_user_id
- `inventory_count_items`: counted_by
- `it_access_requests`: approved_by, executed_by, requested_by, requested_profile_id
- `it_backup_logs`: generated_ticket_id, verified_by
- `it_responsibility_terms`: delivered_by, received_by, related_maintenance_order_id, related_ticket_id
- `it_ticket_comments`: author_id · `it_ticket_priority_history`: changed_by
- `it_tickets`: maintenance_order_id, opened_on_behalf_of
- `item_estruturas`: alternative_product_id, criado_por
- `jur_contract_addendums`: created_by · `jur_contract_approvals`: approver_user_id · `jur_contract_documents`: author_id
- `jur_contract_signatories`: employee_id · `jur_contracts`: approved_by, created_by · `jur_corporate_acts`: created_by
- `jur_intellectual_property`: responsible_user_id · `jur_legal_alerts`: escalated_to_user_id
- `jur_legal_case_deadlines`: backup_user_id, confirmed_by, created_by, escalation_user_id, fulfilled_by
- `jur_legal_case_events`: created_by · `jur_legal_case_provisions`: assessed_by
- `jur_legal_cases`: created_by, opposing_party_client_id, opposing_party_supplier_id
- `jur_lgpd_data_subject_requests`: identity_verified_by · `jur_lgpd_incidents`: created_by
- `jur_lgpd_processing_activities`: created_by · `jur_proxies`: created_by, superseded_proxy_id
- `lot_controls`: created_by, production_order_id, purchase_id, supplier_id, release_inspection_id, released_by
- `maintenance_orders`: created_by, diagnosed_by, reported_by
- `marketing_campaigns`: budget_approved_by · `marketing_materials`: approved_by
- `master_production_plan_lines`: decided_by, product_id
- `master_production_plans`: canceled_by, firmed_by, released_by
- `movimentos_estoque`: usuario_id · `non_conformities`: purchase_item_id, responsible_id, service_order_id, supplier_id
- `numeros_serie`: lote_id · `ordens_producao`: criado_por
- `product_drawings`: approved_by · `production_downtimes`: created_by
- `production_lot_consumptions`: user_id · `production_order_reservations`: created_by
- `production_order_tracking`: operator_id
- **`production_orders`: created_by, product_id, responsible_id, sales_order_id**
- `production_routes`: approved_by, created_by
- **`purchase_orders`: requester_id, supplier_id** (tabela sem nenhum índice além da PK e do UNIQUE de `order_number`)
- `purchase_order_approvals`: approver_user_id · `purchase_requisition_items`: suggested_supplier_id
- `purchase_requisitions`: approved_by, department_id, production_order_id
- `quality_inspections`: non_conformity_id · `requisicao_compra_items`: requisicao_id
- `requisicoes_compra`: aprovado_por, solicitante_id
- **`sales`: customer_id, user_id** (tabela sem nenhum índice além da PK)
- **`service_orders`: client_id, created_by, product_id, responsible_id, technician_id** (idem)
- `sst_acidente_complementos`: registrado_por · `sst_acidente_testemunhas`: employee_id · `sst_acidentes`: registrado_por
- `sst_acoes_corretivas`: created_by · `sst_asos`: registrado_por · `sst_candidatos_cipa`: employee_id
- `sst_cats`: emitente_id · `sst_dds_presencas`: employee_id · `sst_devolucoes_epi`: registrado_por
- `sst_entregas_epi`: entregue_por, inventory_movement_id · `sst_estornos_entrega_epi`: estornado_por
- `sst_inspecao_itens`: acao_corretiva_id · `sst_inspecoes_seguranca`: inspetor_id
- `sst_investigacoes_acidente`: created_by · `sst_membros_cipa`: treinamento_cipa_id
- `sst_permissoes_trabalho`: autorizante_id, department_id · `sst_pt_executantes`: employee_id
- `sst_registros_dds`: condutor_id · `sst_reuniao_cipa_presentes`: membro_cipa_id
- `sst_reunioes_cipa`: created_by · `sst_risco_epis`: tipo_epi_id · `sst_riscos_ocupacionais`: created_by
- `sst_tipos_epi`: created_by · `sst_treinamentos`: created_by
- `warehouse_transfers`: approved_by, user_id

**Padrão dominante (é o achado, não o número):** ~120 das 190 são colunas de **autoria/aprovação** (`created_by`, `approved_by`, `*_confirmed_by`, `registrado_por`, `requester_id`). O efeito prático não é só `SEQ SCAN` em join: **toda tentativa de `DELETE`/`UPDATE` de PK em `users` ou `employees` dispara verificação de integridade referencial que varre integralmente cada uma dessas ~120 tabelas**, segurando lock. Em `users`, que é referenciada por dezenas dessas FKs, isso é um evento de indisponibilidade, não uma lentidão.

---

### 5. FINDINGS PROPOSTOS

Todos `PROPOSED`. Nenhum `CONFIRMED` aqui (Regra 22). CRITICAL/HIGH seguem ao `vericore-finding-validator`.

---

#### `T13-F01` — `ON DELETE CASCADE` destrói a cadeia de rastreabilidade de produção, e três FKs da mesma entidade discordam entre si

**Severidade proposta:** HIGH · **Confiança:** ALTA

Um único `DELETE FROM production_orders WHERE id = X` produz, pelo schema declarado, três efeitos incompatíveis e nenhum bloqueio:

| FK | Regra | Efeito |
|---|---|---|
| `fk_production_lot_consumptions_order_id` (`…frozen.sql:23312`) | **CASCADE** | apaga o registro de **quais lotes foram consumidos** naquela OP |
| `fk_production_order_tracking_order_id` (`:23344`) | **CASCADE** | apaga o log de operações/apontamentos da OP |
| `production_order_reservations_production_order_id_fkey` (`:25160`) | **CASCADE** | apaga as reservas |
| `fk_lot_controls_production_order_id` (`:23136`) | **SET NULL** | o lote produzido **perde a OP de origem** |
| `fk_serial_numbers_production_order_id` (`:23568`) | **SET NULL** | o número de série **perde a OP de origem** |

Nenhuma das FKs de `production_orders` é `RESTRICT`. Não há `deleted_at` em lugar nenhum do schema (§3.2), logo não existe caminho "soft" que evite o `DELETE`.

**Impacto:** um recall não consegue responder "qual lote entrou em qual OP" para OPs apagadas — a mesma pergunta que `20260810-000039-sale-lot-shipments-quality-gate.cjs:24-27` declara existir para justificar a criação de `sale_lot_shipments`. A migration constrói a rastreabilidade na saída enquanto o schema permite destruí-la na produção. Contradiz a intenção ISO 9001 §8.5.2 declarada em `…-000039…cjs:17-20`.

**Âncora:** `server/database/postgresql/00_baseline_frozen.sql:23136, 23312, 23344, 23568, 25160`.

**Nota anti-falso-positivo:** procurei controle compensatório de aplicação. Não há `paranoid`, não há `deleted_at`, e a política "usuário é desativado, não removido" citada em `…-000040…cjs:46-48` cobre `users`, **não** `production_orders`. Se existir guarda de rota impedindo `DELETE` de OP, ela é de aplicação e não do banco — o que é exatamente o objeto desta trilha. Escalono a verificação da camada de aplicação ao titular de T-11.

---

#### `T13-F02` — `uq_mrp_sem_duplicidade` é inócuo por NULL: mesma classe de defeito provada por T-06

**Severidade proposta:** HIGH · **Confiança:** ALTA

```
ADD CONSTRAINT uq_mrp_sem_duplicidade UNIQUE (item_id, origem, origem_id, data_necessidade)   -- :18435
CREATE TABLE public.mrp_ordens_planejadas (
    ...
    origem   public.origem_mrp NOT NULL,   -- :10148
    origem_id uuid,                         -- :10149  ← NULLABLE
```

Em PostgreSQL, `NULL` não colide com `NULL` em índice único (default `NULLS DISTINCT`). Portanto **toda ordem planejada cujo `origem_id` seja NULL escapa integralmente da restrição** — a constraint cujo nome é literalmente "sem duplicidade" não impede duplicidade na exata linha que não tem documento de origem.

Esta é **a mesma classe de defeito** que `T-06_ESTOQUE_IDEMPOTENCIA.md` provou em `inventory_movements` (`('adjustment', NULL)` não colide). T-06 provou o caso; T-13 responde à pergunta que T-06 deixou aberta — **"onde mais existe UNIQUE inócuo por NULL?"**. Varri as 109 declarações de unicidade. Resultado:

- **`uq_mrp_sem_duplicidade`** — inócuo para `origem_id IS NULL`. **Único caso confirmado com coluna comprovadamente nullable dentro da amostra tier1/tier2.**
- `uq_budget_lines_cost_center_year_month_category` (`:21974`) — **imune por desenho**: usa `COALESCE(month, 0)`. Registro como o **padrão correto já existente no próprio repositório** — a correção de `uq_mrp_sem_duplicidade` não precisa inventar técnica nova.
- `uq_production_order_reservations_active` (`:22044`) e `uq_sale_reservations_active` (`:22065`) — **imunes**: o predicado parcial inclui `AND production_order_id IS NOT NULL` / `AND sale_id IS NOT NULL`, excluindo as linhas NULL do índice em vez de deixá-las escapar mudas.
- Os demais UNIQUE multi-coluna (`uq_item_suppliers_item_supplier`, `uq_rfq_quotes_item_supplier`, `uq_sst_*_par`, `uq_hr_job_position_trainings_pair`, …) recaem sobre colunas que são chave de junção obrigatória; **fora da amostra declarada, a nulabilidade individual dessas colunas não foi verificada** → `RES-T13-03`.

**Âncora:** `…frozen.sql:10149` e `:18435`; comparar com `:21974`, `:22044`, `:22065`.

**Interface com T-06:** convergente, não divergente. Nenhum escalonamento Regra 20 necessário.

---

#### `T13-F03` — `inventory_movements` não tem NENHUMA declaração de unicidade, e a correção óbvia continuaria inócua

**Severidade proposta:** HIGH · **Confiança:** ALTA

`inventory_movements` (`…frozen.sql:7077-7091`) tem PK, 6 índices comuns (`:19629-19664`, `:21659-21666`) e **zero** `UNIQUE` — nenhuma constraint, nenhum índice único, nenhum índice parcial. O par polimórfico é:

```
reference_id   integer,                                       -- :7086  NULLABLE
reference_type enum_inventory_movements_reference_type NOT NULL -- :7087
```

Existe `CREATE INDEX inventory_movements_reference_type_reference_id` (`:21666`) — **comum, não único**. Confirmo por leitura estática exatamente o que T-06 provou por análise de fluxo: um `UNIQUE (reference_type, reference_id)` **não resolveria FIND-ERP-001**, porque as linhas de ajuste gravam `reference_id = NULL` e NULL não colide.

O model `server/src/models/InventoryMovement.ts:43-47` documenta essa nulabilidade como decisão deliberada ("NULL em ajuste manual/aprovação de contagem/scan mobile, que não têm documento de origem"). Ou seja: **a nulabilidade é correta e a chave de idempotência precisa ser outra** — não é caso de tornar a coluna `NOT NULL`.

**Impacto:** a tabela que é a fonte da verdade de estoque não tem nenhuma barreira física contra dupla gravação. Toda a idempotência vive em código.

**Âncora:** `…frozen.sql:7077-7091`, `:21666`; `server/src/models/InventoryMovement.ts:43-51`.

**Insumo para remediação (não é decisão minha):** o padrão correto já existe no repositório em duas formas — `COALESCE` (`:21974`) e índice parcial com `IS NOT NULL` explícito (`:22044`). A escolha da chave de negócio é decisão de projeto, não de auditoria.

---

#### `T13-F04` — `accounts_receivable` não tem chave de negócio de parcela; BR-FIN-003 não tem contrapartida no banco

**Severidade proposta:** HIGH · **Confiança:** ALTA

`BR-FIN-003` (`BR_CATALOG.md:324`, `CONFIRMED por decisão humana`, texto normativo em `:329-333`) determina: *"Duas parcelas de mesmo valor no mesmo título são LEGÍTIMAS. Portanto `valor da parcela + título` não pode ser usado isoladamente como identificador único… A identificação deve usar chave de negócio inequívoca (ID da parcela, sequência/número da parcela, identificador imutável equivalente…)"*.

O schema declarado:

```
CREATE TABLE public.accounts_receivable (
    id integer NOT NULL,
    sale_id integer,                       -- :3337  NULLABLE
    customer_id integer NOT NULL,
    installment integer DEFAULT 1 NOT NULL, -- :3339
    amount numeric(10,2) NOT NULL,
    ...
```

A coluna `installment` — que é exatamente a *"sequência/número da parcela"* que a decisão cita — **existe e não participa de nenhuma restrição de unicidade**. `accounts_receivable` tem apenas `accounts_receivable_pkey` e um índice em `cost_center_id` (`:18719`). Não há `UNIQUE (sale_id, installment)`, nem índice nessa combinação.

**Impacto:** o banco aceita N linhas idênticas em `(sale_id, installment, amount, due_date)`. A "chave de negócio inequívoca" exigida pela decisão do dono não existe fisicamente; se o código a usar, ele a usa sem lastro. Isto é matéria direta do `REMEDIATION_CASE ERP-LEGACY-001-CASE-001`, que `BR_CATALOG.md:345-347` declara restringido por BR-FIN-003.

**Âncora:** `…frozen.sql:3335-3359`, `:18719`; `docs/coretriad/projects/ERP-LEGACY-001/BR_CATALOG.md:324,329-333`.

**Ressalva de escopo:** não afirmo que BR-FIN-003 esteja violada no código — isso é T-14. Afirmo que **o banco não a impõe e não oferece a chave que ela exige**.

---

#### `T13-F05` — 7 tabelas vivas do schema sem model Sequelize e sem nenhuma referência em `server/src`

**Severidade proposta:** MEDIUM · **Confiança:** ALTA (inexistência de model) / MÉDIA (inexistência total de acesso)

`server/src/models/` tem 186 arquivos; 185 declaram `tableName` e o 186º é `index.ts`. Grep de `tableName:` em **todo** `server/` retorna zero ocorrências fora de `server/src/models/`, e zero em `server/src/modules/` — portanto **185 é o universo completo de models**.

Confrontando 185 `tableName` × 207 tabelas, **21 tabelas não têm model**. Doze delas são as órfãs PT com `COMMENT … DEPRECATED` e teste-guarda (§3.4 — **não são finding**). Duas são tabelas de log de migração (`migracao_bom_log`, `migracao_product_item_map`). Restam **7 tabelas vivas, com FK e índices próprios, sem model**:

| Tabela | Definida em | Situação |
|---|---|---|
| `hr_candidates` | `…frozen.sql:5789` | referenciada por FK de `hr_admission_processes` (`:24…`), sem model |
| `hr_job_vacancies` | `:6134` | referenciada por `hr_candidates` e `hr_admission_processes`, sem model |
| `hr_performance_reviews` | `:6259` | sem model |
| `hr_payroll_import_batches` | `:6171` | sem model |
| `hr_payroll_import_items` | `:6206` | sem model |
| `hr_time_sheet_summaries` | `:6353` | tem `UNIQUE (employee_id, competencia)` (`:22009`) e índice próprio, sem model |
| `sst_estornos_entrega_epi` | `:13285` | tem 2 FKs e índice próprio, sem model |

Grep dos sete nomes em `server/src/` retorna **apenas comentários**: `server/src/modules/rh/presentation/routes/rh.ts:34`, `…/use-cases/timeImport/GetMonthlyAttendanceSummaryUseCase.ts:11`, `…/domain/services/rhSensitiveFields.ts:20,50,128`. Nenhum `SELECT`/`INSERT` literal.

**Impacto:** `rhSensitiveFields.ts:50` declara *"Campos de dado financeiro individual de `hr_payroll_import_items` (RF-RH-072)"* e implementa sanitização LGPD para uma tabela **que nenhuma camada do sistema acessa**. Ou o requisito RF-RH-072 não está implementado, ou o acesso ocorre por caminho que não localizei estaticamente. Nos dois casos há divergência entre o que o schema declara e o que o sistema exerce. Escalono a `T-12 (rh/sst + LGPD)` e a `T-14`.

**Âncora:** `…frozen.sql:5789, 6134, 6171, 6206, 6259, 6353, 13285`; `server/src/modules/rh/domain/services/rhSensitiveFields.ts:50`.

---

#### `T13-F06` — A guarda de drift model × banco é unidirecional e não roda fora do modo integração

**Severidade proposta:** MEDIUM · **Confiança:** ALTA

`server/tests/integration/schema-model-drift-guard.test.ts` é o controle compensatório que nasceu das "bombas NOT NULL". Ele é bom, e o registro como controle compensatório é obrigatório. Mas tem duas fronteiras que precisam ficar declaradas:

1. **Unidirecional.** A asserção é `if (!column.nullable && !column.hasDefault && modelAllowsNull)` (`:132`) — só detecta **banco exige × model permite**. A direção inversa — **model declara `allowNull: false` sobre coluna NULLABLE no banco** — não é testada por nenhuma das duas asserções (`:96` e `:144`). Essa direção é precisamente a que interessa à missão desta trilha: invariante que o código presume e o banco não impõe.
2. **Condicionado ao ambiente.** `const describeIntegration = integrationEnabled() ? describe : describe.skip` (`:44`) e importação tardia de `sequelize` (`:67`). Sem banco disponível, **a suíte inteira é pulada silenciosamente** — passa verde sem ter verificado nada. O próprio cabeçalho do arquivo reconhece que `tsc --noEmit` e a suíte unitária mockada não veem o schema (`:16-18`).

O arquivo também documenta, em `:33-36`, que `erp_evok_audio_test` já teve **29 colunas `NOT NULL` a mais** que o banco de dev **com as mesmas migrations** — declarando explicitamente que *"nenhum dos dois era reproduzível a partir do versionado"*. Isso é a justificativa formal do pedido `DYN-T13-02`.

`KNOWN_EXCEPTIONS` está **vazio** (`:51-54`) — registro como conformidade: a guarda não virou depósito de exceções.

**Âncora:** `server/tests/integration/schema-model-drift-guard.test.ts:44, 51-54, 67, 96, 132, 144-173`.

---

#### `T13-F07` — CHECK constraints cobrem os módulos novos e deixam o núcleo comercial/estoque/produção descoberto

**Severidade proposta:** MEDIUM · **Confiança:** ALTA

97 CHECKs no baseline, concentrados em `jur_*` (17), `facility_*` (13), `sst_*` (10), `hr_*` (10), `marketing_*` (5), `it_*` (7), `treasury/budget/accounting` (4). Por contraste, **não têm nenhum CHECK**:

`sales`, `sale_items`, `sale_invoices`, `purchase_orders`, `purchase_order_items`, `purchase_requisitions`, `accounts_payable` (exceto `ck_jur_accounts_payable_legal_expense_type_requires_case`, `:3237`, que é regra jurídica e não financeira), `accounts_receivable`, `products`, `inventory_movements`, `inventory_counts`, `lot_controls`, `production_orders`, `bill_of_materials`, `bill_of_material_items`, `serial_numbers`, `quality_inspections`, `production_lot_consumptions`, `production_route_steps`, `audit_logs`.

Consequência concreta e verificável: **`ck_op_quantidades` (`:10333`) protege `ordens_producao` — a tabela PT DEPRECATED — enquanto `production_orders`, a tabela viva, não tem CHECK algum.** O mesmo para `ck_movimentos_quantidade`/`ck_movimentos_saldo` (`:10122-10123`) em `movimentos_estoque` (DEPRECATED) contra `inventory_movements` (viva, sem CHECK). **As invariantes de quantidade foram escritas para as tabelas mortas e não migradas para as vivas.**

Nada no banco impede `inventory_movements.quantity` negativa, `sale_items.quantity <= 0`, `products.quantity` negativa ou `purchase_order_items.unit_price < 0`. `ck_product_warehouse_stock_quantity_non_negative` (`:10523`) protege o saldo por depósito, mas não `products.quantity`.

**Âncora:** `…frozen.sql:10122-10123, 10333, 10523`; ausência verificável nas definições de `:7077`, `:10891`, `:11197`, `:12213`, `:12412`.

---

#### `T13-F08` — `bill_of_materials (product_id, revision)` sem UNIQUE: BR-CAD-012 é regra só de aplicação, e o padrão correto já existe ao lado

**Severidade proposta:** MEDIUM · **Confiança:** ALTA

`BR-CAD-012 — "Revisão de BOM duplicada é recusada"` (`BR_CATALOG.md:184`), âncora declarada `bomService.ts:281`.

O schema (`…frozen.sql:4039-4055`) tem `product_id integer NOT NULL` e `revision character varying(10) DEFAULT '00' NOT NULL`, e a única unicidade de `bill_of_materials` é `uq_bill_of_materials_active_per_product` (`:21967`), **parcial em `WHERE status = 'active'`**. Duas BOMs `draft`/`obsolete` do mesmo produto com a mesma `revision` são aceitas pelo banco.

O contraste é dentro da mesma família de entidades: **`production_routes` tem `CREATE UNIQUE INDEX production_routes_product_id_revision` (`:21848`) além do parcial `uq_production_routes_active_per_product` (`:22051`).** Rota tem os dois; BOM tem só um. Não é lacuna de conhecimento da equipe — é assimetria.

**Âncora:** `…frozen.sql:4039-4055`, `:21967`; comparar `:21848` e `:22051`; `BR_CATALOG.md:184`.

---

#### `T13-F09` — `audit_logs.user_id ON DELETE SET NULL`: a trilha sobrevive, a autoria não

**Severidade proposta:** MEDIUM · **Confiança:** ALTA

`ADD CONSTRAINT fk_audit_logs_user_id FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;` (`…frozen.sql:22840`).

Apagar um usuário **anonimiza retroativamente todas as suas ações no log de auditoria**, sem apagar as linhas — a trilha fica intacta em volume e vazia em responsabilidade, que é a pior combinação para auditoria (parece completa, não é).

**Controle compensatório localizado e avaliado:** `…-000040-purchase-order-requester-not-null.cjs:46-48` declara a política *"Quem saiu da empresa é desativado (`users.active = false`), não removido — a trilha de auditoria fiscal exige histórico imutável."* E de fato `fk_inventory_movements_user_id` é `ON DELETE RESTRICT` (`:23016`), o que **impede** apagar usuário que tenha movimentado estoque. **Portanto o risco é parcialmente mitigado, e reduzo a severidade por isso.** Mas o mitigante é incidental: um usuário que só aprovou documentos e nunca movimentou estoque continua deletável, e sua autoria some do `audit_logs`. A política de "desativar, não remover" **não está expressa em nenhuma constraint sobre `users`**.

**Interface com T-03 (imutabilidade de tabelas de auditoria):** este ponto é complementar, não conflitante — T-03 tratou de imutabilidade de linha; este trata de imutabilidade de atribuição. **Escalono a T-03 para confronto**, sem conciliar em silêncio (Regra 20).

**Âncora:** `…frozen.sql:22840`, `:23016`; `server/migrations/20260810-000040-purchase-order-requester-not-null.cjs:46-48`.

---

#### `T13-F10` — `sst_matriz_epi.department_id ON DELETE CASCADE` diverge do padrão e apaga registro de obrigação legal

**Severidade proposta:** MEDIUM · **Confiança:** ALTA

`ADD CONSTRAINT sst_matriz_epi_department_id_fkey … REFERENCES public.departments(id) ON UPDATE CASCADE ON DELETE CASCADE;` (`…frozen.sql:25664`).

Todas as demais FKs para `departments` que localizei são `RESTRICT` — `sst_riscos_ocupacionais_department_id_fkey`, `sst_inspecoes_seguranca_department_id_fkey`, `sst_registros_dds_department_id_fkey`, `facility_areas_department_id_fkey`, `hr_job_positions_department_id_fkey`, `jur_lgpd_processing_activities_department_id_fkey`. `sst_matriz_epi` é a **única exceção** e é justamente a matriz de EPI por departamento — registro de obrigação NR-6. Apagar um departamento apaga a matriz de EPI dele sem aviso.

Reforça a leitura de que é desvio e não desenho: `sst_matriz_epi.tipo_epi_id` (`:25672`) **não** é CASCADE. As duas FKs da mesma tabela usam políticas diferentes.

**Âncora:** `…frozen.sql:25664` vs. `:25672`, `:25816`, `:25632`, `:25744`, `:22528`, `:24…`.

---

#### `T13-F11` — Schema **declarado** ≠ schema **efetivo** em pontos onde a diferença é o próprio controle de segurança

**Severidade proposta:** MEDIUM · **Confiança:** ALTA (sobre o fato) / declaradamente NÃO-VERIFICÁVEL estaticamente (sobre a materialização)

`purchase_orders.requester_id` é **NULLABLE no baseline** (`…frozen.sql:11530`) e só se torna `NOT NULL` pela migration pós-freeze `20260810-000040`. Essa migration documenta em `:9-22` que, enquanto a coluna aceitar NULL, *"um pedido gravado sem solicitante é aprovável por qualquer pessoa, inclusive por quem o criou"* — ou seja, **a segregação de função D-K é contornável**. Ela também **aborta em vez de pular** se houver linha pendente (`:59-67`).

Consequência auditável: em qualquer instância onde `20260810-000040` **não tenha sido aplicada** (por ter abortado, ou por drift), o controle de segregação de função está desarmado no nível do banco, e **isso não é detectável por leitura de arquivo** — o repositório é idêntico nos dois casos. É a definição de por que `DYN-05` existe para esta trilha.

O mesmo raciocínio vale para as outras 8 migrations pós-freeze, incluindo `20260812-000047-hr-absences-open-unique.cjs:30` (unicidade de afastamento aberto, que a própria migration declara falhar de propósito se houver dado ambíguo, `:20-24`) e `20260810-000044` (`lot_controls.blocked_at`).

**Âncora:** `…frozen.sql:11530`; `server/migrations/20260810-000040-purchase-order-requester-not-null.cjs:9-22, 59-67`; `server/migrations/20260812-000047-hr-absences-open-unique.cjs:20-33`.

---

#### `T13-F12` — Constraints e índices duplicados: 6 FKs redundantes, ≥7 índices idênticos, 5 unicidades declaradas duas vezes

**Severidade proposta:** LOW · **Confiança:** ALTA

**FKs duplicadas** (mesma coluna, mesmo alvo, dois nomes — dupla verificação de integridade a cada `INSERT`/`UPDATE`):
`item_detalhes_comerciais.categoria_id` (`fk_item_detalhes_comerciais_categoria_id` `:23032` + `item_detalhes_comerciais_categoria_id_fkey` `:24368`); `item_detalhes_comerciais.item_id` (`:23040` + `:24376`); `item_especificacoes_tecnicas.item_id` (`:23048` + `:24384`); `item_estruturas.item_componente_id` (`:23…` + `:24392`); `item_estruturas.item_pai_id` (+ `:24400`); `item_estruturas.parent_item_estrutura_id` (+ `:24408`).

**Índices exatamente duplicados:** `inventory_movements(item_id)` — `idx_inventory_movements_item_id` (`:19629`) + `idx_inventory_movements_item_id_fk` (`:19643`); `purchase_order_items(item_id)` (`:20854` + `:20868`); `sale_items(item_id)` (`:21029` + `:21043`); `bill_of_material_items(item_id)` (`:18824` + `:18852`); `serial_numbers(item_id)` (`:21078` + `:21918`); `serial_numbers(item_id,status)` (`:21092` + `:21925`); `production_routes(item_id)` (`:20826` + `:21834`).

**Unicidade declarada duas vezes** (constraint + índice único): `accounting_chart_of_accounts.code` (`:16467` + `:21946`); `accounting_entries.entry_number` (`:16483` + `:21953`); `treasury_financial_operations.contract_number` (`:18355` + `:22142`); `serial_numbers.serial_number` (`:17987` + `:21939`); `items.codigo` (`:17283` + `:19965`).

**Nome enganoso:** `CREATE INDEX idx_item_categorias_codigo_unique` (`:19818`) é índice **comum**, apesar do sufixo `_unique`. A unicidade real vem de `item_categorias_codigo_key` (`:17235`) — funciona, mas o nome mente para quem audita o schema.

**Impacto:** custo de escrita e de manutenção, não de correção. Reporto porque duplicação de constraint é sintoma de migrations que reaplicaram o mesmo objeto sem `IF NOT EXISTS` coerente — o que interessa ao co-titular `vericore-migration-auditor`.

---

### 6. LACUNAS DECLARADAS (`RES-T13-nn`) — sub-entrega declarada, não silenciosa

| ID | Lacuna | Por quê | Quem fecha |
|---|---|---|---|
| `RES-T13-01` | **IN-08 não satisfeito.** Nenhuma proveniência de commit foi estabelecida para nenhum artefato. | Bash desabilitado; `git log`/`git show` impossíveis. | Reexecução com Bash, ou o audit-director declara IN-08 dispensado para T-13 |
| `RES-T13-02` | Cruzamento FK×índice (459×510) feito por confronto manual, não por script. | Sem Bash não há `join`/`sort`. Margem de erro estimada em ±3 itens sobre 190. | Confirmação por `DYN-T13-03` (a consulta ao catálogo resolve exatamente) |
| `RES-T13-03` | **Nulabilidade coluna-a-coluna verificada apenas na amostra tier1/tier2 (22 tabelas de 207).** | Verificar 207 tabelas × ~25 colunas estaticamente excede o orçamento de 5 S da trilha. | `DYN-T13-02` resolve integralmente e com mais rigor que a leitura estática |
| `RES-T13-04` | **Transações, nível de isolation e estratégia de locking NÃO foram auditados.** | Estão na minha carta de responsabilidades, mas fora do escopo textual de T-13 no plano (`AUDIT_PLAN.md:392-397`), que se limita a schema/models/FK/índice/UNIQUE. Só encontrei uso de transação incidentalmente (`…-000043…cjs:141`, `…-000046…cjs`). | Escalono ao audit-director: ou amplia T-13, ou aloca a trilha de backend. **Não assumo cobertura que não tive.** |
| `RES-T13-05` | Classificação de dados sensíveis / proporcionalidade de ERD e dicionário de dados não avaliadas. | Idem — não constam do escopo textual de T-13; `rhSensitiveFields.ts` é insumo de T-12. | audit-director |
| `RES-T13-06` | Reconciliação model×tabela fecha em 185 models ↔ 186 tabelas mapeadas com **discrepância de 1** que não consegui atribuir nominalmente. | Possível `tableName` duplicado entre dois models, ou model apontando para tabela fora das 207. Não afirmo qual sem prova. | `DYN-T13-04` |
| `RES-T13-07` | FKs das 9 migrations pós-freeze verificadas quanto a índice apenas nas que declaram `addIndex` explicitamente. `directorates.manager_id` e `sale_lot_shipments.product_id`(coberto por índice composto) não foram confrontados com o mesmo rigor das 459 do baseline. | Volume. | `DYN-T13-03` |

---

### 7. PEDIDOS DE EVIDÊNCIA DINÂMICA (DYN-05 · não executo)

Banco alvo em todos: **`erp_evok_audio_test`** (efêmero). Nenhum comando abaixo escreve; todos são `SELECT` sobre catálogo. Nenhum extrai segredo.

**`DYN-T13-01` — Migrations aplicadas × migrations versionadas**
```sql
SELECT name FROM "SequelizeMeta" ORDER BY name;
```
*Verificar:* se as 169 migrations do repositório estão aplicadas, e se existe entrada `…-000042-…` (ausente do diretório). *Por que estático não basta:* o diretório mostra o que **existe**; só o banco mostra o que **foi aplicado**. Um `000042` presente no `SequelizeMeta` e ausente do diretório significa migration removida sem `down` — schema efetivo com objeto que nenhum arquivo versionado descreve.

**`DYN-T13-02` — Drift de nulabilidade, bidirecional (fecha `RES-T13-03` e `T13-F06`)**
```sql
SELECT table_name, column_name, is_nullable, column_default
  FROM information_schema.columns
 WHERE table_schema = 'public'
 ORDER BY table_name, ordinal_position;
```
*Verificar:* confronto das 207 tabelas contra `rawAttributes` de cada um dos 185 models, **nas duas direções** — inclusive a direção que `schema-model-drift-guard.test.ts:132` não testa (`model allowNull:false × banco NULLABLE` = invariante que o código presume e o banco não impõe). *Por que estático não basta:* o próprio repositório registra em `schema-model-drift-guard.test.ts:33-36` que dois bancos com **as mesmas migrations** chegaram a divergir em 29 colunas `NOT NULL`. Se isso é verdade, o arquivo versionado **não determina** o schema efetivo, e nenhuma leitura estática pode fechar esta questão.

**`DYN-T13-03` — FK sem índice, medido no catálogo (fecha `RES-T13-02` e `RES-T13-07`)**
```sql
SELECT c.conrelid::regclass AS tabela,
       a.attname            AS coluna,
       c.conname            AS fk
  FROM pg_constraint c
  JOIN LATERAL unnest(c.conkey) WITH ORDINALITY AS k(attnum, ord) ON true
  JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
 WHERE c.contype = 'f' AND k.ord = 1
   AND NOT EXISTS (
       SELECT 1 FROM pg_index i
        WHERE i.indrelid = c.conrelid
          AND i.indkey[0] = k.attnum)
 ORDER BY 1, 2;
```
*Verificar:* a contagem de 190/459 apurada em §4, agora sobre as **478** FKs efetivas. *Por que estático não basta:* meu confronto foi manual (`RES-T13-02`) e cobre só o baseline; o catálogo é exato e inclui as pós-freeze.

**`DYN-T13-04` — Tabelas sem model e models sem tabela (fecha `RES-T13-06` e valida `T13-F05`)**
```sql
SELECT c.relname AS tabela,
       (SELECT count(*) FROM pg_constraint f WHERE f.confrelid = c.oid AND f.contype='f') AS refs_recebidas
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public' AND c.relkind = 'r'
 ORDER BY 1;
```
*Verificar:* lista efetiva confrontada com os 185 `tableName`; identificar a discrepância de 1. *Por que estático não basta:* uma tabela criada por migration com nome dinâmico, ou renomeada, não aparece no baseline.

**`DYN-T13-05` — Políticas `ON DELETE` efetivas (valida `T13-F01`, `T13-F09`, `T13-F10`)**
```sql
SELECT c.conrelid::regclass AS origem, c.confrelid::regclass AS destino,
       c.conname, c.confdeltype
  FROM pg_constraint c
 WHERE c.contype = 'f' AND c.connamespace = 'public'::regnamespace
   AND c.confrelid::regclass::text IN
       ('production_orders','users','departments','sales','purchase_orders','lot_controls')
 ORDER BY 2, 1;
```
*Verificar:* que as CASCADE/SET NULL de §5 são as efetivas — em particular se `fk_purchase_orders_requester_id` está `RESTRICT` (`d`=`r`) ou ainda `SET NULL` (`n`), o que responde `T13-F11` diretamente. *Por que estático não basta:* `20260810-000040` recria a FK **e pode ter abortado** (`:59-67`); o arquivo é idêntico nos dois desfechos.

**`DYN-T13-06` — Unicidade inócua por NULL, medida em dado (valida `T13-F02`, `T13-F03`, `T13-F04`)**
```sql
SELECT count(*) FILTER (WHERE origem_id IS NULL) AS mrp_sem_origem,
       (SELECT count(*) FROM inventory_movements WHERE reference_id IS NULL) AS mov_sem_ref,
       (SELECT count(*) FROM (SELECT sale_id, installment FROM accounts_receivable
                               GROUP BY 1,2 HAVING count(*)>1) d) AS parcelas_duplicadas
  FROM mrp_ordens_planejadas;
```
*Verificar:* quantas linhas já escapam de cada UNIQUE inócuo. *Por que estático não basta:* a leitura estática prova que a **porta está aberta**; só o dado prova **quantos já passaram** — informação que muda a severidade e o desenho da remediação.

---

### 8. ESCALONAMENTOS ABERTOS (Regra 20 — não concilio em silêncio)

1. **→ `vericore-audit-director`:** `RES-T13-04` e `RES-T13-05`. Minha carta de responsabilidades inclui transações/isolation/locking e classificação de dado sensível; o escopo textual de T-13 no plano (`AUDIT_PLAN.md:392-397`) não. **Não declaro cobertura que não tive.** Decisão necessária: ampliar T-13 ou alocar a outra trilha.
2. **→ `vericore-audit-director`:** `RES-T13-01`. Bash indisponível torna IN-08 inatingível nesta trilha. Precisa de dispensa registrada ou reexecução.
3. **→ T-03 (`T-03_AUDIT_LOG_REPORT.md`):** `T13-F09`. `audit_logs.user_id ON DELETE SET NULL` afeta imutabilidade de **atribuição**, dimensão possivelmente distinta da imutabilidade de **linha** que T-03 tratou. Confronto explícito solicitado.
4. **→ T-06 (`T-06_ESTOQUE_IDEMPOTENCIA.md`):** `T13-F02`/`T13-F03` **convergem** com T-06 e estendem o achado a `mrp_ordens_planejadas`. Sem divergência. Registro para que a remediação de FIND-ERP-001 não seja desenhada sem `T13-F03`.
5. **→ T-11 (`T-11_PRODUCAO_MRP.md`):** duas mensagens. (a) `is_phantom` **existe** no schema (§3.7) — a falha de projeção é de código. (b) `T13-F01` exige verificação da camada de aplicação: existe guarda impedindo `DELETE` de `production_orders`?
6. **→ T-12 (rh/sst + LGPD):** `T13-F05`. `hr_payroll_import_items` tem sanitizador LGPD (`rhSensitiveFields.ts:50`, RF-RH-072) e **nenhuma camada de acesso**.
7. **→ T-14 (BRs):** `T13-F04` (BR-FIN-003 sem lastro no banco) e `T13-F08` (BR-CAD-012 sem lastro no banco). São insumos de status de BR; **não decido o status da BR**.
8. **→ `vericore-migration-auditor` (co-titular):** `T13-F12` — duplicação de constraints/índices é sintoma de reaplicação de migration.

---

### 9. ARQUIVOS LIDOS

**Schema e migrations**
- `c:/Sistema EvokAudio/ERP-Evok--Audio-LTDA/server/database/postgresql/00_baseline_frozen.sql` (integral por extração dirigida: 200 `CREATE TABLE`, 200 PK, 459 FK, 70 UNIQUE, 510 índices, 97 CHECK, comentários `DEPRECATED`)
- `c:/Sistema EvokAudio/ERP-Evok--Audio-LTDA/server/database/postgresql/00_baseline_frozen_meta.sql` (integral, 160 migrations)
- `c:/Sistema EvokAudio/ERP-Evok--Audio-LTDA/server/migrations/20260810-000038-bom-phantom-explosion.cjs` (integral)
- `c:/Sistema EvokAudio/ERP-Evok--Audio-LTDA/server/migrations/20260810-000039-sale-lot-shipments-quality-gate.cjs` (integral)
- `c:/Sistema EvokAudio/ERP-Evok--Audio-LTDA/server/migrations/20260810-000040-purchase-order-requester-not-null.cjs` (integral)
- `c:/Sistema EvokAudio/ERP-Evok--Audio-LTDA/server/migrations/20260810-000041-reapply-app-role-privileges.cjs` (dirigido)
- `c:/Sistema EvokAudio/ERP-Evok--Audio-LTDA/server/migrations/20260811-000043-create-directorates-hierarchy.cjs` (integral)
- `c:/Sistema EvokAudio/ERP-Evok--Audio-LTDA/server/migrations/20260811-000044-lot-blocked-at-quality-gate.cjs` (dirigido)
- `c:/Sistema EvokAudio/ERP-Evok--Audio-LTDA/server/migrations/20260812-000045-create-hr-time-imports.cjs` (dirigido)
- `c:/Sistema EvokAudio/ERP-Evok--Audio-LTDA/server/migrations/20260812-000046-create-directorate-governance.cjs` (dirigido)
- `c:/Sistema EvokAudio/ERP-Evok--Audio-LTDA/server/migrations/20260812-000047-hr-absences-open-unique.cjs` (integral)
- inventário completo de `c:/Sistema EvokAudio/ERP-Evok--Audio-LTDA/server/migrations/` (169 arquivos)

**Models**
- `c:/Sistema EvokAudio/ERP-Evok--Audio-LTDA/server/src/models/` — inventário completo (186 arquivos) e extração de `tableName` de 185
- `c:/Sistema EvokAudio/ERP-Evok--Audio-LTDA/server/src/models/InventoryMovement.ts` (integral)

**Controles compensatórios**
- `c:/Sistema EvokAudio/ERP-Evok--Audio-LTDA/server/tests/integration/schema-model-drift-guard.test.ts` (integral)
- inventário de `c:/Sistema EvokAudio/ERP-Evok--Audio-LTDA/server/tests/**/*guard*.ts` (14 arquivos)

**Insumos normativos (validados, nunca copiados)**
- `c:/Sistema EvokAudio/ERP-Evok--Audio-LTDA/audit/runs/ERP-LEGACY-001-AUD-001/02-plan/AUDIT_PLAN.md:370-407`
- `c:/Sistema EvokAudio/ERP-Evok--Audio-LTDA/docs/coretriad/projects/ERP-LEGACY-001/BR_CATALOG.md` (dirigido: `:118-221`, `:320-347`)

**Não lido (declarado):** `01_schema.sql`, `02_indexes.sql`, `03_seed_inicial.sql` e os `04*.sql` de `server/database/postgresql/` — são artefatos **anteriores** ao congelamento e o plano fixa `00_baseline_frozen.sql` como fonte (`AUDIT_PLAN.md:612`). Registro para que ninguém conclua que foram auditados.

---

**Status desta trilha:** entregue com 12 findings `PROPOSED` (0 CRITICAL, 4 HIGH, 7 MEDIUM, 1 LOW), 7 conformidades provadas, 7 lacunas declaradas (`RES-T13-01`..`07`), 6 pedidos DYN e 8 escalonamentos. **Nenhum finding é `CONFIRMED`. Nada aqui declara `AUDIT_PASSED`, `RETEST_PASSED` ou `REMEDIATION COMPLETE`.** Nenhum arquivo foi criado ou alterado.
