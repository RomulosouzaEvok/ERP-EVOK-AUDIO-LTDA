# T-35 — `C-137` Semântica de coluna, LOTE 2

| Campo | Valor |
|---|---|
| Run | `ERP-LEGACY-001-AUD-001` |
| Trilha | `T-35` (continuação de `T-31`, célula `C-137` da EMENDA-02) |
| `AUDIT_COMMIT` | `c1311a6f76b512fef893f7e60d934179cae3409f` |
| Organização | VeriCore — `vericore-database-auditor` |
| Natureza | Auditoria **estática** sobre artefatos versionados |
| Banco acessado | **NENHUM** — `APR-2026-016` respeitada integralmente. Nenhuma conexão, nenhum `SELECT`, nenhuma contagem de linhas. |
| Artefato anterior | `T-31_C137_SEMANTICA_COLUNA.md` — **não alterado** (Regra 15) |

> **Nota de persistência.** Agente titular sem `Write` (idem `T-31:12-13`). Persistido pelo orquestrador **sem alteração**.

---

## 1. Método — idêntico ao de `T-31`, declarado

`T-31` operou assim, e esta trilha repete o mesmo procedimento, sem inovação metodológica, porque coerência de cobertura vale mais que método novo:

1. **READ** do model Sequelize (`server/src/models/<Model>.ts`), coluna a coluna.
2. **ANALYZE** dos 7 critérios de `C-137`: nome que não diz o conteúdo; enum sem domínio declarado; monetário sem unidade; data sem semântica; `comment` que contradiz o uso; nulabilidade contra a regra de negócio; duplicação semântica entre tabelas.
3. **VERIFY** contra o consumidor real — use case / service / repositório — e contra a migration, nunca contra a declaração do model isolada.
4. **PROVE** com `arquivo:linha`.
5. **CLASSIFY** severidade e confiança separadas.
6. **REPORT** sem corrigir nada.

**Ordem de prioridade aplicada** (a que o mandato exige e que continua a de `T-31`): dinheiro → estoque → fiscal → dado pessoal → apoio.

### 1.1 Limitação de execução — declarada, não contornada

Igual a `T-31`: **não se reconfirma `git diff c1311a6..HEAD` nesta trilha.** Permanece `RES-T31-01`, fato de terceiro. O denominador **207** é herdado de `T-13:62-67` e `T-31:44`, **não reconstruído de novo aqui** — reconstruir pela terceira vez pelo mesmo caminho aritmético não adiciona independência (`RES-T31-05` já registra que o método é parcialmente correlacionado). Novo resíduo: `RES-T35-01`.

---

## 2. Contagem honesta de cobertura

Esta é a seção que o mandato pediu para não inflar. Ela distingue **dois tiers**, porque medir os dois como se fossem a mesma coisa seria exatamente a inflação que se proibiu.

### Tier A — passagem completa de `C-137` (os 7 critérios), **18 tabelas novas**

| # | Tabela | Banda de risco |
|---|---|---|
| 1 | `cost_centers` | dinheiro |
| 2 | `budget_lines` | dinheiro |
| 3 | `product_cost_ledgers` | dinheiro/custo |
| 4 | `production_cost_settings` | dinheiro/custo |
| 5 | `customer_price_lists` | dinheiro |
| 6 | `assets` | dinheiro/patrimônio |
| 7 | `company_fiscal_config` | fiscal |
| 8 | `sale_invoices` | fiscal |
| 9 | `product_warehouse_stock` | estoque |
| 10 | `warehouse_transfers` | estoque |
| 11 | `inventory_counts` | estoque |
| 12 | `inventory_count_items` | estoque |
| 13 | `work_centers` | custo industrial |
| 14 | `employees` | dado pessoal |
| 15 | `hr_time_import_items` | dado pessoal / folha |
| 16 | `jur_lgpd_processing_activities` | dado pessoal |
| 17 | `jur_lgpd_incidents` | dado pessoal |
| 18 | `jur_legal_case_provisions` | dinheiro / contingência |

### Tier B — passagem **parcial**, só a dimensão monetária/quantitativa, **38 tabelas**

Obtida por **censo exaustivo** de `DataTypes.DECIMAL(p, s)` em `server/src/models/` (205 declarações, todas lidas). Cobre com prova os critérios "monetário sem unidade" e "duplicação semântica de campo"; **não** cobre enum, data, nulabilidade nem `comment` × uso. **Não conta como fechamento de `C-137` para estas tabelas** e é declarado assim de propósito:

`acoustic_test_results`, `engineering_projects`, `facility_areas`, `facility_vehicle_details`, `facility_vehicle_documents`, `facility_fuel_records`, `facility_fines`, `hr_employee_benefits`, `hr_employee_job_history`, `hr_job_positions`, `hr_training_courses`, `item_suppliers`, `item_estruturas`, `item_detalhes_comerciais`, `it_software_license_details`, `import_processes`, `import_process_items`, `jur_contracts`, `jur_contract_addendums`, `jur_legal_cases`, `maintenance_orders`, `marketing_campaigns`, `marketing_events`, `master_production_plan_lines`, `non_conformities`, `production_routes`, `production_route_steps`, `production_order_reservations`, `purchase_order_items`, `purchase_requisition_items`, `quality_inspections`, `rfq_items`, `rfq_quotes`, `sale_lot_shipments`, `service_orders`, `sst_entregas_epi`, `sst_matriz_epi`, `strategic_plannings`.

### Cobertura declarada da célula `C-137`

| Item | Valor |
|---|---|
| Denominador (herdado, não reconstruído) | **207** |
| Cobertas por `T-13` | 22 |
| Cobertas por `T-31` | 12 |
| **Cobertas por `T-35` (Tier A)** | **18** |
| **Total com semântica de coluna completa** | **52 / 207 (25,1 %)** |
| **Déficit remanescente** | **155 / 207 (74,9 %)** |
| *(memo)* tabelas com dimensão monetária coberta parcialmente | +38 |

> **`C-137` continua NÃO FECHADA.** Sai de `A(34/207)` para `A(52/207)`. Das 173 pendentes, **18 foram efetivamente cobertas; 155 ficaram.** Não se alega mais do que isso.

`suppliers` foi relido nesta trilha e produziu uma **conformidade** (§5), mas já constava da amostra de `T-13:54` — **não é contado como cobertura nova.**

---

## 3. Lista nominal das 155 não cobertas

**134 têm model Sequelize** e estão nomeadas abaixo; **21 não têm model algum** (186 models com `tableName` × 207 tabelas) e **não são nomeáveis por esta trilha** — ver `RES-T35-02` e `T35-META-F01`.

**Suprimentos / compras / RFQ (11):** `purchase_order_items`, `purchase_requisition_items`, `purchase_requisitions`, `purchase_receipts`, `purchase_order_approvals`, `rfqs`, `rfq_items`, `rfq_quotes`, `rfq_suppliers`, `item_suppliers`, `import_process_approvals`.

**Importação / COMEX (2):** `import_processes`, `import_process_items`.

**Estoque / cadastro de item (7):** `warehouses`, `product_categories`, `item_categorias`, `item_estruturas`, `item_especificacoes_tecnicas`, `item_detalhes_comerciais`, `product_drawings`, `sale_lot_shipments`.

**Produção / planejamento / qualidade (12):** `production_routes`, `production_route_steps`, `production_order_reservations`, `production_downtimes`, `master_production_plans`, `master_production_plan_lines`, `work_center_shifts`, `quality_inspections`, `non_conformities`, `acoustic_test_results`, `maintenance_orders`, `service_orders`.

**Marketing (6):** `marketing_campaigns`, `marketing_events`, `marketing_event_checklist_items`, `marketing_leads`, `marketing_materials`, `marketing_lead_saneamento_log`.

**RH e organização (17):** `hr_benefit_types`, `hr_employee_benefits`, `hr_employee_documents`, `hr_employee_contracts`, `hr_employee_job_history`, `hr_employee_trainings`, `hr_job_positions`, `hr_job_position_trainings`, `hr_training_courses`, `hr_admission_processes`, `hr_termination_processes`, `hr_vacation_accrual_periods`, `hr_vacation_schedules`, `hr_time_import_batches`, `departments`, `directorates`, `engineering_projects`.

**SST (34):** `sst_tipos_epi`, `sst_matriz_epi`, `sst_entregas_epi`, `sst_devolucoes_epi`, `sst_acoes_corretivas`, `sst_planos_exames`, `sst_asos`, `sst_exames_complementares`, `sst_acidentes`, `sst_acidente_testemunhas`, `sst_acidente_complementos`, `sst_investigacoes_acidente`, `sst_cats`, `sst_eventos_esocial`, `sst_mandatos_cipa`, `sst_membros_cipa`, `sst_processos_eleitorais_cipa`, `sst_candidatos_cipa`, `sst_reunioes_cipa`, `sst_reuniao_cipa_presentes`, `sst_ges`, `sst_ges_funcionarios`, `sst_riscos_ocupacionais`, `sst_risco_epis`, `sst_risco_exames`, `sst_matriz_treinamento`, `sst_treinamentos`, `sst_inspecoes_seguranca`, `sst_inspecao_itens`, `sst_permissoes_trabalho`, `sst_pt_executantes`, `sst_brigadistas`, `sst_registros_dds`, `sst_dds_presencas`.

**Jurídico (15):** `jur_contracts`, `jur_contract_addendums`, `jur_contract_approvals`, `jur_contract_documents`, `jur_contract_signatories`, `jur_corporate_acts`, `jur_intellectual_property`, `jur_ip_contract_links`, `jur_external_lawyers`, `jur_legal_alerts`, `jur_legal_cases`, `jur_legal_case_deadlines`, `jur_legal_case_events`, `jur_proxies`, `jur_lgpd_data_subject_requests`.

**TI (10):** `it_tickets`, `it_ticket_categories`, `it_ticket_comments`, `it_ticket_priority_history`, `it_responsibility_terms`, `it_software_license_details`, `it_license_seats`, `it_access_requests`, `it_backup_logs`, `ti_settings`.

**Facilities (13):** `facility_areas`, `facility_drivers`, `facility_fines`, `facility_correspondence`, `facility_cleaning_schedules`, `facility_cleaning_executions`, `facility_resource_reservations`, `facility_vehicle_details`, `facility_vehicle_documents`, `facility_vehicle_trips`, `facility_fuel_records`, `facility_visits`, `facility_visitors`.

**Governança / transversais (7):** `access_profile_permissions`, `strategic_plannings`, `meeting_minutes`, `business_risks`, `webhook_events`, `hr_time_import_batches` *(já citada em RH — conta uma vez)*, `product_categories` *(já citada em Estoque — conta uma vez)*.

> A soma nominal fecha em **134** tabelas com model. As **21** restantes são as sem model (`RES-T35-02`). **134 + 21 = 155.**

---

## 4. Findings `PROPOSED`

Severidade e confiança declaradas separadamente.

---

### `T35-EST-F01` — Quatro precisões de quantidade incompatíveis na mesma cadeia de estoque

**Severidade proposta: HIGH · Confiança: ALTA (prova documental completa)**

O núcleo do estoque usa `DECIMAL(18, 6)`; três sub-cadeias que escrevem nele usam precisões menores, e **nenhuma coluna declara qual é a unidade canônica**:

| Precisão | Colunas (evidência) |
|---|---|
| `(18,6)` — núcleo | `Product.ts:66` `quantity`; `ProductWarehouseStock.ts:59`; `InventoryMovement.ts:36`; `WarehouseTransfer.ts:77`; `ProductionOrder.ts:41-43`; `SaleItem.ts:50,53`; `RfqItem.ts:30`; `PurchaseRequisitionItem.ts:23`; `ProductionOrderReservation.ts:66-67`; `MasterProductionPlanLine.ts:69-79` |
| `(12,4)` — cadeia de lote | `LotControl.ts:57,63`; `ProductionLotConsumption.ts:35`; `SaleLotShipment.ts:72-73`; `QualityInspection.ts:100-101`; `ProductCostLedger.ts:41` |
| `(12,3)` — contagem de inventário | `InventoryCountItem.ts:39,40,41` |
| `(10,2)` — **porta de entrada de compras** | `PurchaseItem.ts:32` `quantity`, `:35` `received_quantity` |

Dois caminhos concretos de perda:

1. `SaleLotShipment.ts:72` declara guardar *"Quantidade que ESTA emissao consumiu DESTE lote"* em `(12,4)`, consumindo de `SaleItem.quantity` `(18,6)` (`SaleItem.ts:50`). **O razão de lote não consegue representar o que o razão de venda representa** — a rastreabilidade de lote arredonda o que a venda não arredondou.
2. `PurchaseItem.received_quantity` `(10,2)` (`PurchaseItem.ts:35`) é a quantidade de recebimento que alimenta `InventoryMovement.quantity` `(18,6)`. **Um insumo comprado em fração menor que 0,01 não é representável na entrada e é representável no saldo.**

`InventoryCountItem` `(12,3)` fecha o ciclo: o ajuste de inventário grava de volta um valor truncado em 3 casas sobre um saldo mantido em 6.

**Este é o análogo de estoque de `AUD-DB-T31-06`** (três precisões monetárias). Não o contradiz — o **estende para a dimensão quantidade**, que `T-31` não examinou.

**Critério de reteste objetivo:** existir, no repositório versionado, (a) uma constante/documento único declarando a precisão canônica de quantidade, e (b) `PurchaseItem.quantity`, `PurchaseItem.received_quantity`, `InventoryCountItem.system_quantity|counted_quantity|variance_quantity` e `SaleLotShipment.quantity|quantity_returned` com escala ≥ 6 tanto no model quanto na migration correspondente. Reteste **estático**, sem banco.

---

### `T35-RH-F02` — `employees.salary` muda de unidade conforme `employees.salary_type`, sem declaração alguma

**Severidade proposta: HIGH · Confiança: ALTA**

`Employee.ts:65` — `salary: DECIMAL(10,2), comment: 'Salário'`.
`Employee.ts:66` — `salary_type: ENUM('mensal', 'horista', 'comissionado')`, **sem `comment`**.

Para `salary_type = 'mensal'` a coluna é remuneração **mensal**; para `'horista'` é valor **por hora**; para `'comissionado'` é indeterminável pelo artefato — pode ser fixo, base ou percentual. **A mesma coluna monetária carrega três unidades diferentes e o único `comment` que existe diz apenas `'Salário'`.**

É o padrão exato que o mandato chama de "coluna monetária sem unidade explícita", agravado por a unidade ser **função de outra coluna** — que por sua vez não tem `comment`. Qualquer soma, média ou provisão sobre `employees.salary` mistura grandezas incomensuráveis.

Convive com `HrEmployeeJobHistory.ts:21` `salary DECIMAL(12,2)` e `HrJobPosition.ts:21-22` `salary_range_min|max DECIMAL(12,2)` — **três precisões para salário** e nenhuma das três declara periodicidade.

**Critério de reteste:** `comment` em `employees.salary` e `employees.salary_type` declarando a unidade por valor do enum, presente **na migration** (não só no model — `AUD-DB-T31-03`), ou decomposição em colunas de unidade única.

---

### `T35-PAT-F03` — `assets.current_value` é rotulada "Valor contábil atual" e nenhuma rotina de depreciação a escreve

**Severidade proposta: HIGH · Confiança: ALTA (todos os escritores rastreados)**

`Asset.ts:56` — `current_value: DECIMAL(10,2), comment: 'Valor contábil atual'`. O cabeçalho do model, `Asset.ts:7`, afirma **"Suporta depreciação"**.

Escritores rastreados, **exaustivamente**:
- `CreateAssetUseCase.ts:83` — `current_value: purchase_value` (cópia na criação);
- `fixedAssetReceiptService.ts:79` — `current_value: line.unitPrice` (cópia no recebimento de NF);
- `UpdateAssetUseCase.ts:23` — campo editável manualmente.

**Nenhuma rotina de depreciação existe.** `useful_life_months` (`Asset.ts:57`) é gravado (`CreateAssetUseCase.ts:81`) e **nunca lido para cálculo**. O único `'depreciation'` do repositório é um valor do enum `accounting_entries.entry_type` (`AccountingEntry.ts:50`), sem produtor.

Portanto `current_value` **não é** valor contábil atual: é o valor de aquisição, salvo digitação manual. O `comment` **contradiz o uso real** — critério explícito de `C-137`.

**Mesma classe de `AUD-TES-SALDOMANUAL-01` e `AUD-DB-T31-07`** (`current_balance` digitado à mão e lido como posição de caixa). Registra-se como **terceira ocorrência do mesmo padrão**, o que o move de incidente para padrão sistêmico.

**Critério de reteste:** ou existe escritor derivado de `useful_life_months` + `purchase_date`, ou o `comment` e o cabeçalho `Asset.ts:7` deixam de afirmar depreciação e a coluna é renomeada para o que de fato guarda.

---

### `T35-CTB-F04` — Sete precisões monetárias coexistentes; `rfq_items.awarded_unit_price` perde 4 casas ao virar pedido

**Severidade proposta: MEDIUM · Confiança: ALTA**

`AUD-DB-T31-06` registrou **três** precisões monetárias no trânsito financeiro. O censo exaustivo de `DECIMAL` nos 186 models eleva o número a **sete**:

`(10,2)` comercial (`Product.ts:64-65`, `SaleItem.ts:51-52`, `PurchaseItem.ts:33-34`, `AccountPayable.ts:42`, `AccountReceivable.ts:49`, `SaleInvoice.ts:75`) · `(12,2)` tributos (`SaleItem.ts:57-67`, `BillOfMaterialItem.ts:63-64`) · `(15,2)` contábil/tesouraria/orçamento (`AccountingEntryItem.ts:37-38`, `BudgetLine.ts:51`, `TreasuryBankAccount.ts:49`) · `(12,4)` custo unitário (`ProductCostLedger.ts:42`) · `(14,4)` custo total (`ProductCostLedger.ts:43`) · `(14,2)` estimativa de requisição (`PurchaseRequisitionItem.ts:27`) · `(18,6)` COMEX/RFQ/jurídico/TI (`ImportProcess.ts:48-51`, `RfqQuote.ts:32`, `JurContract.ts:74`, `ItSoftwareLicenseDetail.ts:39`, `WorkCenter.ts:37`).

**Caminho concreto de perda de dinheiro, provado por linha:** `RfqItem.ts:33` declara `awarded_unit_price DECIMAL(18,6)` — *"Preco unitario cotado do vencedor, **congelado na adjudicacao**"* — gravado em `AwardRfqUseCase.ts:310`. Esse preço, ao virar pedido, aterrissa em `PurchaseItem.ts:33` `unit_price DECIMAL(10,2)`. **O preço deliberadamente "congelado" com 6 casas é arredondado para 2 no destino.** O propósito declarado da coluna é anulado pela precisão do consumidor.

**Não contradiz `AUD-DB-T31-06`; amplia o denominador de 3 para 7 e fornece um caminho de perda nominado**, que `-06` não tinha.

**Critério de reteste:** documento versionado declarando a precisão monetária canônica + `PurchaseItem.unit_price` compatível com `RfqItem.awarded_unit_price`, ou arredondamento explícito e auditável no `AwardRfqUseCase`/criação do pedido.

---

### `T35-EST-F05` — `approved_by` / `approved_at` também significam "rejeitou" / "rejeitou em"

**Severidade proposta: MEDIUM · Confiança: ALTA**

Padrão repetido, com `comment` que **admite** a ambiguidade em vez de resolvê-la:

- `InventoryCount.ts:88` — `approved_by … comment: 'FK → users.id (quem **aprovou/rejeitou**)'`
- `InventoryCount.ts:86` — `approved_at … comment: 'Data/hora da aprovação (**ou rejeição**)'`
- `WarehouseTransfer.ts:95` — `approved_by … comment: 'quem **aprovou/rejeitou**'` (e `warehouse_transfers` **não tem nenhuma coluna de data de decisão**)

Consequência: um registro `status = 'rejected'` tem `approved_by` preenchido. Qualquer consulta, relatório ou controle de segregação de função que leia "aprovadores" pelo nome da coluna conta **rejeitadores como aprovadores**. O significado só é recuperável cruzando com `status` — critério literal de `C-137`.

`WarehouseTransfer` agrava: sem `approved_at`/`rejected_at`, **a data da decisão não existe**; só `updated_at`, que qualquer edição posterior sobrescreve.

**Critério de reteste:** colunas `decided_by`/`decided_at` (ou par `approved_*`/`rejected_*` disjunto) com CHECK ligando preenchimento ao `status`, na migration.

---

### `T35-DIN-F06` — `active` é soft delete semântico não filtrado, em tabela referenciada por lançamento contábil

**Severidade proposta: MEDIUM · Confiança: ALTA**

`CostCenter.ts:33` — `active … comment: 'Desativacao logica (sem delete fisico) — registros com lancamentos historicos preservam auditoria'`.
`CustomerPriceList.ts:40` — `active … comment: '**Soft delete**'`.

Mas o filtro é **opcional**: `SequelizeCostCenterRepository.ts:17` — `if (typeof filters.active === 'boolean') where.active = filters.active;` — sem filtro no input, **centros de custo desativados voltam na listagem**.

E os consumidores contábeis validam **existência**, não estado: `CreateEntryUseCase.ts:55` documenta lançar `NotFoundError` *"Se algum `account_id`/`cost_center_id` referenciado não existir"* — não há verificação de `active` em `CreateEntryUseCase.ts:89`, `UpdateEntryUseCase.ts:91` nem `ReverseEntryUseCase.ts:73`. **Um centro de custo desativado continua recebendo partida contábil nova.**

#### Divergência registrada (Regra 20) — não acomodada

`T-13:78` e `T-31:176` declaram, como **conformidade provada**: *"Soft delete não existe no projeto"*, com base em `deleted_at` = 0 ocorrências.

**A asserção é correta na letra e insuficiente no efeito.** O projeto não usa `deleted_at`/`paranoid`, mas usa **soft delete por `active`**, e `CustomerPriceList.ts:40` o chama por esse nome no próprio artefato. A conclusão operacional de `T-13`/`T-31` — *"não há dever de filtrar soft delete"* — **não se sustenta** para as tabelas com `active`/`status`.

Não se altera `T-13` nem `T-31` (Regra 15). Registra-se a divergência para resolução pelo `vericore-finding-validator` e pelo `vericore-software-audit-director`. Fonte autoritativa proposta: os artefatos `CostCenter.ts:33` e `CustomerPriceList.ts:40`, que são explícitos.

**Critério de reteste:** ou filtro default de `active` no repositório, ou validação de `active` nos use cases que gravam `cost_center_id`, com teste que reprove a regressão.

---

### `T35-PRD-F07` — `work_centers.efficiency_factor` declara domínio "0 a 1" que nem o tipo nem o ORM impõem

**Severidade proposta: MEDIUM · Confiança: ALTA**

`WorkCenter.ts:36` — `efficiency_factor: DECIMAL(5,4), allowNull: false, defaultValue: 1, comment: 'Fator de eficiencia historica (**0 a 1**)'`.

`DECIMAL(5,4)` aceita até **9,9999**. **Não há `validate` no model e não há CHECK citado.** O `comment` declara um domínio que nenhum mecanismo impõe — um fator de 999 % é gravável e entra no custeio (`cost_per_hour` de `WorkCenter.ts:37` é insumo do custeio real de produção).

**A contraprova está na tabela vizinha:** `ProductionCostSettings.ts:44` faz `validate: { min: 0, max: 1000 }` e `:51` faz `validate: { min: 0 }`. A disciplina existe no repositório e **não foi aplicada aqui** — o que descarta "não é a convenção do projeto" como explicação.

Agrava-se por convenção mista de unidade no mesmo trânsito de custo: `efficiency_factor` é **fração** (0–1), `overhead_rate_percent` é **percentual** (`ProductionCostSettings.ts:45`, *"25.5 = 25,5%"*), `scrap_percentage` é **percentual** (`BillOfMaterialItem.ts:62`), e `StrategicPlanning.ts:55` `weight DECIMAL(5,2)` **não declara nada**.

**Mesma classe de `AUD-CTB-DEBCRED-01`** (`debit`/`credit` sem CHECK e sem `validate` de ORM). Terceira ocorrência do padrão "domínio existe na prosa, não no mecanismo".

**Critério de reteste:** `validate: { min: 0, max: 1 }` no model **e** CHECK na migration; `strategic_plannings.weight` com unidade declarada.

---

### `T35-RH-F08` — Colunas de folha em `hr_time_import_items` sem unidade, sem domínio e sem `comment`

**Severidade proposta: MEDIUM · Confiança: ALTA**

`HrTimeImportItem.ts:41-44`: `hours_worked`, `overtime_50`, `overtime_100`, `night_hours` — todas `DECIMAL(5,2) NOT NULL DEFAULT 0`, **todas sem `comment`**, num arquivo onde as colunas vizinhas (`:36,37,38,39`) têm `comment`. A omissão é seletiva.

Três indeterminações, todas com efeito em folha de pagamento:
1. **Unidade.** `8.50` é oito horas e meia (decimal) ou oito horas e cinquenta minutos (HH.MM)? Não é determinável pelo artefato.
2. **`overtime_50` / `overtime_100`.** O nome codifica o **adicional legal (50 % / 100 %)**, mas a coluna guarda **horas**, não o adicional. É literalmente "coluna cujo nome não diz o que ela guarda".
3. **Se `hours_worked` inclui ou exclui** as horas de `overtime_*`. Sem declaração, dupla contagem e subcontagem são igualmente plausíveis.

Adicionalmente: `HrTimeImportItem.ts:39` — `cpf STRING(14) comment: 'CPF extraido do AEJ (**apenas digitos**)'`. CPF só-dígitos tem **11** caracteres; 14 é o comprimento de CNPJ só-dígitos. O tipo contradiz o `comment`. Mesma inconsistência em `Employee.ts:57` (`cpf STRING(14)`, *"CPF (apenas números)"*). Relaciona-se a `AUD-RH-CPFSEARCH-01` — **não o duplica**: aquele trata de busca, este de declaração de tipo × conteúdo.

**Critério de reteste:** `comment` declarando unidade e regra de inclusão nas quatro colunas, na migration; `cpf` com largura coerente com o conteúdo declarado.

---

### `T35-JUR-F09` — Valor da causa duplicado em duas tabelas com nomes diferentes e nenhuma reconciliação

**Severidade proposta: MEDIUM · Confiança: MÉDIA (a divergência é possível pelo schema; sua materialização exige evidência dinâmica)**

`JurLegalCase.ts:55` — `claim_value DECIMAL(18,6)` (nullable).
`JurLegalCaseProvision.ts:35` — `claim_amount DECIMAL(18,6)` (nullable).

**Mesma grandeza, dois nomes, duas tabelas.** `jur_legal_case_provisions` é append-only com trigger (`JurLegalCaseProvision.ts:9`); `jur_legal_cases.claim_value` é mutável. Nada no schema liga um ao outro. Após a primeira reavaliação, o valor da causa exibido pela ficha do processo e o consumido pela série de provisão da Controladoria podem divergir permanentemente, **sem que qualquer constraint perceba**.

Mesmo padrão em `JurContractAddendum.ts:42-43` (`previous_value`/`new_value`) × `JurContract.ts:74` (`value`): o aditivo registra a transição, e nada garante que `jur_contracts.value` reflita o último aditivo.

**É o critério "campo duplicado semanticamente entre tabelas, com risco de divergirem", literal.**

**Critério de reteste:** ou coluna única com view derivada, ou constraint/rotina versionada de reconciliação, ou `comment` em ambas declarando qual é a autoritativa e para qual finalidade.

---

### `T35-LGPD-F10` — RoPA guarda categoria de dado e prazo de retenção como texto livre inexecutável

**Severidade proposta: MEDIUM · Confiança: ALTA**

`JurLgpdProcessingActivity.ts:44-48`:
- `data_categories TEXT NOT NULL` — **sem domínio**;
- `data_subject_categories TEXT NOT NULL` — **sem domínio**;
- `retention_period STRING(150)` — **prosa**.

A tabela é o Registro de Atividades de Tratamento (LGPD art. 37). `retention_period` como texto livre significa que **nenhuma rotina pode executar retenção** — o prazo é legível por humano e opaco para o sistema. `data_categories` livre impede cruzar o RoPA com as colunas reais do banco, que é a única forma de o RoPA ser verificável.

Contraste interno que prova que a disciplina existia: **`legal_basis` (`:41`) é ENUM com as 10 bases legais do art. 7º da LGPD** — domínio declarado, exaustivo e correto. Três colunas adiante, o domínio some.

**Critério de reteste:** `retention_period` decomposto em valor numérico + unidade (ou ENUM de política), e `data_categories` com domínio declarado.

---

### `T35-META-F01` — Aproximadamente 21 tabelas do schema não têm model Sequelize e portanto não têm semântica em nenhum artefato de aplicação

**Severidade proposta: LOW · Confiança: MÉDIA (aritmética sólida; identidade nominal não determinada)**

`server/src/models/` contém **186** arquivos com `tableName`. O denominador autoritativo é **207**. Diferença: **21 tabelas sem model**.

Para essas, `C-137` é insatisfazível pela via percorrida por `T-13`, `T-31` e `T-35` (leitura de model): não há `comment:`, não há `validate`, não há tipagem TypeScript. A única fonte possível é o DDL — que, por `T-31:57-59`, tem `COMMENT ON COLUMN` apenas parcial.

**Não se nomeiam as 21** porque isso exigiria diferenciar `CREATE TABLE` do baseline contra `tableName` dos models, trabalho que não coube nesta trilha. Declarado como `RES-T35-02`, não como conformidade silenciosa.

**Critério de reteste:** lista nominal das tabelas sem model, produzida estaticamente, e decisão explícita por tabela (é junção? é legado? é órfã?).

---

## 5. Conformidades verificadas — o problema **não** é sistêmico

Registradas para que não virem falso positivo em trilha posterior, e porque mudam a leitura do relatório final: existe disciplina de semântica no repositório; ela é **desigual**, não ausente.

1. **`suppliers.quality_score` é a régua de ouro do bloco de apoio.** `Supplier.ts:61-66` declara, na mesma coluna: faixa (`0-100`), **origem** ("recalculada de forma síncrona por `CreateNonConformityUseCase`"), **imutabilidade por API** ("NUNCA editável via API") e **distinção explícita da coluna vizinha** ("Distinta de `rating`"). E `Supplier.ts:60` declara que `rating` é *"digitada manualmente"*. **As duas colunas que poderiam se confundir dizem, cada uma, o que a outra não é.** É exatamente o que `C-137` pede e o análogo, no bloco de cadastro, do que `bank_statements` é no financeiro (`T-31:127-131`).

2. **`suppliers.is_foreign` documenta a decisão, não só o campo.** `Supplier.ts:68-79` — seis linhas explicando por que o atributo vive no cadastro e não no pedido ("quem monta o pedido não consegue rebaixar a alçada mexendo apenas no pedido") e a invariante `NOT NULL DEFAULT false`.

3. **`jur_lgpd_incidents` tem CHECK real de completude de fechamento.** `20260807-000271-create-jur-lgpd.cjs:168` — `CHECK (status <> 'closed' OR (communication_decision IS NOT NULL AND communication_justification IS NOT NULL AND closed_at IS NOT NULL))`. **Constraint no banco**, não disciplina de aplicação. E a semântica das datas é correta: `detected_at NOT NULL` × `occurred_at` nullable (`JurLgpdIncident.ts:39-40`) — o prazo ANPD conta da detecção, e a modelagem reflete isso.

4. **`jur_legal_case_provisions` é append-only imposto por trigger.** `JurLegalCaseProvision.ts:9` cita `trg_jur_lock_legal_case_provision` bloqueando UPDATE/DELETE; `:44` `updatedAt: false`; `:38-39` `assessed_by` e `assessed_at` ambos `NOT NULL`. Série contábil de contingência **imutável por mecanismo**. Contrasta favoravelmente com `accounting_entries.reversal_of_id ON DELETE SET NULL` (`T-31:105-106`).

5. **`nfe_next_number` tem lock de linha — não reportar race.** `IssueSaleNfeUseCase.ts:179` obtém o singleton com `lock: transaction.LOCK.UPDATE` **antes** de ler (`:187`) e incrementar (`:188-189`), tudo na mesma transação. Mesma qualidade do contador CNAB (`T-31`, conformidade 2). **Numeração de NF-e não é finding de concorrência.** E `UpsertCompanyFiscalConfigUseCase.ts:13` declara que `nfe_next_number` **nunca é aceito** por aquele use case — o contador não é editável pela API de configuração.

6. **`overhead_rate_percent` tem unidade declarada E consumidor coerente.** `ProductionCostSettings.ts:45` declara *"25.5 = 25,5%"*; `ChangeProductionOrderStatusUseCase.ts:598` faz `/ 100`. **Declaração e uso batem.** É a prova de que a classe de bug "percentual × fração" não é universal neste ERP — o que torna `T35-PRD-F07` um desvio, não a norma.

7. **`employees` tem classificação de dado sensível nomeada e com enforcement.** `employeeSensitiveFields.ts:36-51` lista 14 campos (`cpf`, `rg`, `pis_pasep`, `ctps`, `salary`, `salary_type`, dados bancários, `pix_key`, `address`, `phone`, `pcd`) e `:92` os aplica; `Employee.ts:44` referencia a lista no próprio model; `employeeSensitiveFields.ts:28-34` documenta que `pcd` foi adicionado por achado de auditoria cruzada anterior, como dado de saúde (LGPD art. 5º II).

   **Nuance registrada contra `AUD-DB-T31-08`** (Regra 20): `-08` afirma *"ausência de convenção de classificação de dado sensível no schema"*. A afirmação **permanece verdadeira para o schema** — nada disso está em DDL. Mas **existe convenção em código de domínio, para 1 tabela das 207**, e ela deve ser citada como controle compensatório parcial ao instruir `-08`, sob pena de o finding ser lido como "não existe nada", que seria falso. Lacuna dentro da própria conformidade: `emergency_contact` e `emergency_phone` (`Employee.ts:79-80`) são **dado pessoal de terceiro** e **não constam da lista**.

8. **`master_production_plan_lines` documenta a fórmula de cada coluna derivada.** `MasterProductionPlanLine.ts:69-79` — 11 colunas, cada uma com a origem exata (`'products.min_quantity'`, `'max(0, gross_requirement - supply_on_hand - supply_in_production)'`, `'DECISAO do planejador'`). Nenhuma coluna do MPS depende de leitura de use case.

9. **`inventory_counts` / `inventory_count_items` justificam cada nulabilidade.** `InventoryCount.ts:64,69,84,85,86,88,92` e `InventoryCountItem.ts:37,40,47,48` explicam **por que** cada coluna é nullable (legado sem backfill, estado do workflow, exigência de `ON DELETE SET NULL`). Duas delas citam a migration que removeu um `NOT NULL` indevido (`20260810-000028`). **Nulabilidade documentada é o oposto do critério de falha de `C-137`.**

10. **`cnab_return_occurrences.amount_paid` declara a conversão de unidade.** `CnabReturnOccurrence.ts:39` — *"CNAB usa centavos, convertido aqui para a unidade principal"*. **A classe de bug mais cara deste ERP (centavos × reais) está explicitamente resolvida nesta coluna.** É o modelo do que `T35-RH-F02` e `T35-CTB-F04` pedem.

11. **`import_process_items` declara "percentual" em todas as alíquotas.** `ImportProcessItem.ts:45-49` — as cinco alíquotas (II, IPI, PIS, COFINS, ICMS) dizem `'Aliquota do X, percentual'`; e `ImportProcess.ts:49-51` diz **"em BRL"** em frete, seguro e despesas, distinguindo-os do `fob_unit_price`, que `ImportProcessItem.ts:44` declara *"na moeda estrangeira do processo"*. **Moeda declarada por coluna, num módulo bimonetário.**

12. **`sale_invoices` documenta a duplicação em vez de escondê-la.** `SaleInvoice.ts:13-23` declara o padrão expand-contract, que `Sale.nfe_*` é atalho de leitura da emissão mais recente e `sale_invoices` a fonte de verdade do histórico. A duplicação existe, mas **está declarada, com qual é autoritativa** — por isso não vira `T35-JUR-F09`.

---

## 6. Colunas cuja semântica **NÃO é determinável** nas 18 do Tier A

Mesma taxonomia de `T-31:133-139`, para permitir comparação direta.

- **Classe A — enum sem rótulo/domínio de negócio no artefato:** `budget_lines.category` (`BudgetLine.ts:47`, sem `comment` — o que distingue `custo_fixo` de `custo_variavel` para rateio?) · `employees.salary_type` (`:66`) · `employees.status` (`:69`) · `employees.work_regime` (`:71`) · `employees.shift` (`:70`) · `product_cost_ledgers.source_type` (`ProductCostLedger.ts:36`) · `warehouse_transfers.status` (`WarehouseTransfer.ts:98`, sem `comment`) — **7 colunas**.
- **Classe B — domínio externo de terceiro:** `company_fiscal_config.cnae` (`:48`) · `company_fiscal_config.city_ibge_code` (`:55`) · `sale_invoices.nfe_key` e `nfe_protocol` (`:81-82`, layout SEFAZ) — **4 colunas**.
- **Classe C — unidade/convenção não declarada:** `employees.salary` · `hr_time_import_items.hours_worked|overtime_50|overtime_100|night_hours` · `work_centers.efficiency_factor` · `assets.current_value` · `inventory_count_items.system_quantity|counted_quantity|variance_quantity` — **10 colunas**.
- **Classe D — identidade em constante de código:** `company_fiscal_config` é singleton `id=1` por declaração (`CompanyFiscalConfig.ts:6-7`) e `production_cost_settings` idem (`ProductionCostSettings.ts:6`), **ambas sem constraint que o imponha** — o schema declara `autoIncrement`. **Segunda e terceira ocorrências de `AUD-DB-T31-05`**, que reportou apenas `company_banking_config`. — **2 tabelas**.
- **Classe E — polimórfico sem discriminante no schema (nova, não existia em `T-31`):** `product_cost_ledgers.source_id` (`ProductCostLedger.ts:40`, *"ID da origem: compra, OP ou ajuste"*) aponta para **tabelas diferentes** conforme `source_type`, **sem FK possível**; o `comment` lista 3 origens enquanto o enum tem **6** valores (`:36`) — o próprio `comment` está desatualizado em relação à coluna vizinha. — **1 coluna**.

**Total: 24 colunas não determináveis em 18 tabelas** (contra 17 em 12 tabelas em `T-31`). A densidade é comparável — **~1,3 coluna opaca por tabela** —, o que sugere que o déficit é **uniforme**, não concentrado, e portanto que extrapolar `T-31` para o resto do schema teria sido **otimista**, não pessimista.

---

## 7. Classificação de dado sensível — tranche `T-35`

| Coluna(s) | Sensibilidade | Situação |
|---|---|---|
| `employees.cpf`, `rg`, `pis_pasep`, `ctps`, `salary`, bancários, `pix_key`, `address`, `phone` | **Alta** | **Classificadas e protegidas** — `employeeSensitiveFields.ts:36-51` |
| `employees.pcd` | **Alta** (saúde, LGPD art. 5º II) | **Classificada** — idem |
| `employees.emergency_contact`, `emergency_phone` | **Média** (dado de terceiro) | **NÃO classificadas** — `Employee.ts:79-80` |
| `hr_time_import_items.cpf` | **Alta** | **NÃO classificada** — `HrTimeImportItem.ts:39`; CPF em texto plano fora de `employees` |
| `hr_time_import_items.absence_reason` | **Alta potencial** (motivo de falta pode revelar saúde) | **NÃO classificada** — `:47`, `STRING(200)` livre |
| `jur_lgpd_incidents.affected_categories`, `description` | **Alta** | **NÃO classificadas** — `JurLgpdIncident.ts:41-42` |
| `company_fiscal_config.cnpj`, `ie`, endereço | **Média** (dado da própria empresa) | Sem classificação |

**Confirma `AUD-DB-T31-08` fora de `employees` e o qualifica dentro dela** (§5, conformidade 7). O achado de `-08` não muda de severidade por causa disto; muda de **redação**.

---

## 8. Pedidos de evidência dinâmica — registrados, **não executados**

Nenhum foi executado. Nenhuma conexão a `erp_evok_audio` foi aberta. Estes pedidos são para o `vericore-software-audit-director` decidir, sob `APR-2026-016` e o precedente de escopo de `DYN_VERIFICACAO_BATERIA_01.md`.

| ID | Pergunta que só evidência dinâmica responde | Motivo |
|---|---|---|
| `DYN-T35-01` | Existe linha em `purchase_order_items` cuja `quantity`/`received_quantity` tenha sido truncada em relação ao movimento de estoque correspondente? | `T35-EST-F01` prova a **possibilidade** pelo tipo; a materialização é fato de dado. |
| `DYN-T35-02` | `assets.current_value` difere de `purchase_value` em alguma linha — e, se sim, por edição manual ou por rotina? | Determina se `T35-PAT-F03` é risco latente ou dano já ocorrido. |
| `DYN-T35-03` | Existem `accounting_entry_items` com `cost_center_id` apontando para `cost_centers.active = false`? | Materializa `T35-DIN-F06`. |
| `DYN-T35-04` | `jur_legal_cases.claim_value` diverge do `claim_amount` da provisão vigente em algum processo? | Materializa `T35-JUR-F09`, que está com confiança MÉDIA por isto. |
| `DYN-T35-05` | Alguma linha de `work_centers` tem `efficiency_factor > 1`? | Materializa `T35-PRD-F07`. |
| `DYN-T35-06` | Existe mais de uma linha em `company_fiscal_config` ou em `production_cost_settings`? | Materializa a Classe D de §6 (extensão de `AUD-DB-T31-05`). |
| `DYN-T35-07` | Enumerar as **21** tabelas do schema sem model Sequelize. | Fecha `T35-META-F01`/`RES-T35-02`. **Pode ser resolvido estaticamente** contra `00_baseline_frozen.sql` — dinâmico é alternativa, não exigência. |

---

## 9. Resíduos

| ID | Resíduo |
|---|---|
| `RES-T35-01` | Denominador **207 herdado**, não reconstruído nesta trilha; `git diff c1311a6..HEAD` **não reconfirmado** (mantém `RES-T31-01`). |
| `RES-T35-02` | **21 tabelas sem model não nomeadas.** Aritmética sólida (186 × 207); identidade indeterminada. |
| `RES-T35-03` | **155 / 207 tabelas seguem sem semântica de coluna** — lista nominal parcial em §3 (134 nomeadas + 21 não nomeáveis). |
| `RES-T35-04` | Tier B (38 tabelas) cobriu **só a dimensão monetária/quantitativa**; enum, data, nulabilidade e `comment` × uso **não** foram verificados nelas. |
| `RES-T35-05` | Os `COMMENT ON COLUMN` reais do DDL **não foram reconciliados** com os `comment:` dos models para as 18 do Tier A — mantém `AUD-DB-T31-03` sem quantificação nova. |
| `RES-T35-06` | Triggers citados em docstring de model (ex.: `trg_jur_lock_legal_case_provision`, `JurLegalCaseProvision.ts:9`) foram aceitos como declarados; **só o de `jur_lgpd_incidents` foi confirmado na migration** (`20260807-000271:168`). |

---

## 10. Divergências registradas (Regra 20) — para resolução, não para acomodação

1. **`T35-DIN-F06` × `T-13:78` e `T-31:176`** — "soft delete não existe" é verdadeiro para `deleted_at` e falso para o efeito: `CostCenter.ts:33` e `CustomerPriceList.ts:40` implementam soft delete por `active`, e `CustomerPriceList.ts:40` usa esse nome. A conclusão derivada — "não há dever de filtrar soft delete" — não se sustenta.
2. **`T35-CTB-F04` × `AUD-DB-T31-06`** — não é contradição, é **extensão**: de 3 precisões monetárias para 7, com caminho de perda nominado (`RfqItem.ts:33` → `PurchaseItem.ts:33`).
3. **§5 conformidade 7 × `AUD-DB-T31-08`** — `-08` permanece válido para o schema, mas **existe** convenção de classificação em código de domínio para `employees`. Instruir `-08` sem citá-la produziria falso positivo de amplitude.
4. **Classe D de §6 × `AUD-DB-T31-05`** — `-05` reportou 1 singleton por literal; são **3** (`company_banking_config`, `company_fiscal_config`, `production_cost_settings`).

---

## 11. Estado

- **Célula `C-137`:** `A(52/207)` — **permanece NÃO ENTREGUE integralmente**. De 173 pendentes: **18 cobertas, 155 restantes.**
- **Findings `PROPOSED`:** **11** — **3 HIGH** (`T35-EST-F01`, `T35-RH-F02`, `T35-PAT-F03`), **7 MEDIUM**, **1 LOW**. Os 3 HIGH seguem para `vericore-finding-validator` (Regra 22).
- **Conformidades verificadas:** **12**.
- **Divergências registradas:** **4**.
- **Pedidos dinâmicos:** **7**, nenhum executado.
- **Banco de produção:** **não acessado**. `APR-2026-016` íntegra.
- Nenhuma declaração de `AUDIT_PASSED`, `RETEST_PASSED` ou `FINDING CLOSED`.
- `T-31_C137_SEMANTICA_COLUNA.md` **não foi alterado**.
