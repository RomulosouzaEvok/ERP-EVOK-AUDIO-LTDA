# Dicionário de Dados — ERP EVOK ÁUDIO

> Gerado por introspecção real do PostgreSQL 16 local (`information_schema`), não a partir de leitura de código — reflete o schema efetivamente aplicado pelas migrations no momento da geração. Ver `docs/database/03-MODELO_FISICO.md` para o DDL completo (`pg_dump --schema-only`) e o comando exato usado para regenerar este arquivo.

Legenda: **PK** = chave primária, **FK → tabela.coluna** = chave estrangeira, **UQ** = unique constraint (isolada ou parte de composta), coluna `Nulo?` indica se a coluna aceita `NULL`.

Tabelas marcadas **[ÓRFÃ/DEPRECATED]** fazem parte do schema-fantasma em português (schema-fantasma nunca adotado pelo app real, `COMMENT ON TABLE` aplicado em 2026-08-06) e **não devem ser usadas em código novo** — ver `docs/DATABASE.md` seção "Tabelas órfãs do schema-fantasma em português".

---

## Índice de tabelas (80)

- [`access_profile_permissions`](#accessprofilepermissions)
- [`access_profiles`](#accessprofiles)
- [`accounts_payable`](#accountspayable)
- [`accounts_receivable`](#accountsreceivable)
- [`acoustic_test_results`](#acoustictestresults)
- [`assets`](#assets)
- [`audit_logs`](#auditlogs)
- [`auditoria_eventos`](#auditoriaeventos) `[DEPRECATED]`
- [`bank_statement_entries`](#bankstatemententries)
- [`bank_statements`](#bankstatements)
- [`bill_of_material_items`](#billofmaterialitems)
- [`bill_of_materials`](#billofmaterials)
- [`clients`](#clients)
- [`company_fiscal_config`](#companyfiscalconfig)
- [`cost_centers`](#costcenters)
- [`customer_price_lists`](#customerpricelists)
- [`departments`](#departments)
- [`employees`](#employees)
- [`engineering_projects`](#engineeringprojects)
- [`entradas_nf`](#entradasnf) `[DEPRECATED]`
- [`entradas_nf_items`](#entradasnfitems) `[DEPRECATED]`
- [`fornecedores`](#fornecedores) `[DEPRECATED]`
- [`import_process_items`](#importprocessitems)
- [`import_processes`](#importprocesses)
- [`inventory_count_items`](#inventorycountitems)
- [`inventory_counts`](#inventorycounts)
- [`inventory_movements`](#inventorymovements)
- [`item_categorias`](#itemcategorias)
- [`item_detalhes_comerciais`](#itemdetalhescomerciais)
- [`item_especificacoes_tecnicas`](#itemespecificacoestecnicas)
- [`item_estruturas`](#itemestruturas)
- [`item_suppliers`](#itemsuppliers)
- [`items`](#items)
- [`lot_controls`](#lotcontrols)
- [`lotes`](#lotes) `[DEPRECATED]`
- [`maintenance_orders`](#maintenanceorders)
- [`migracao_bom_log`](#migracaobomlog) `[DEPRECATED]`
- [`migracao_categoria_map`](#migracaocategoriamap) `[DEPRECATED]`
- [`migracao_product_item_map`](#migracaoproductitemmap) `[DEPRECATED]`
- [`movimentos_estoque`](#movimentosestoque) `[DEPRECATED]`
- [`mrp_ordens_planejadas`](#mrpordensplanejadas)
- [`non_conformities`](#nonconformities)
- [`numeros_serie`](#numerosserie) `[DEPRECATED]`
- [`ordens_producao`](#ordensproducao) `[DEPRECATED]`
- [`product_categories`](#productcategories)
- [`product_cost_ledgers`](#productcostledgers)
- [`product_drawings`](#productdrawings)
- [`product_warehouse_stock`](#productwarehousestock)
- [`production_cost_settings`](#productioncostsettings)
- [`production_downtimes`](#productiondowntimes)
- [`production_lot_consumptions`](#productionlotconsumptions)
- [`production_order_tracking`](#productionordertracking)
- [`production_orders`](#productionorders)
- [`production_route_steps`](#productionroutesteps)
- [`production_routes`](#productionroutes)
- [`products`](#products)
- [`purchase_order_items`](#purchaseorderitems)
- [`purchase_orders`](#purchaseorders)
- [`purchase_receipts`](#purchasereceipts)
- [`purchase_requisition_items`](#purchaserequisitionitems)
- [`purchase_requisitions`](#purchaserequisitions)
- [`requisicao_compra_items`](#requisicaocompraitems) `[DEPRECATED]`
- [`requisicoes_compra`](#requisicoescompra) `[DEPRECATED]`
- [`rfq_items`](#rfqitems)
- [`rfq_quotes`](#rfqquotes)
- [`rfq_suppliers`](#rfqsuppliers)
- [`rfqs`](#rfqs)
- [`sale_items`](#saleitems)
- [`sales`](#sales)
- [`serial_numbers`](#serialnumbers)
- [`service_orders`](#serviceorders)
- [`suppliers`](#suppliers)
- [`users`](#users)
- [`usuarios`](#usuarios) `[DEPRECATED]`
- [`warehouse_transfers`](#warehousetransfers)
- [`warehouses`](#warehouses)
- [`webhook_events`](#webhookevents)
- [`webhooks_eventos`](#webhookseventos) `[DEPRECATED]`
- [`work_center_shifts`](#workcentershifts)
- [`work_centers`](#workcenters)

---

## `access_profile_permissions`

Matriz módulo × nível (operate/approve) de um perfil de acesso.

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | INTEGER | NÃO | auto-increment | **PK** |
| `access_profile_id` | INTEGER | NÃO | - | FK → `access_profiles.id`, UQ |
| `module` | VARCHAR(50) | NÃO | - | UQ |
| `level` | enum_access_profile_permissions_level | NÃO | - | - |
| `created_at` | TIMESTAMP WITH TIME ZONE | NÃO | CURRENT_TIMESTAMP | - |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NÃO | CURRENT_TIMESTAMP | - |

## `access_profiles`

Perfis de acesso configuráveis por área (RBAC granular). **Achado de nomenclatura (auditoria 2026-08-06):** colunas `nome`/`descricao` em português, único par PT nesta tabela — nome da tabela, demais colunas (`allowed_warehouses`, `active`, `created_at`/`updated_at`) e a tabela filha `access_profile_permissions` (`module`, `level`) são 100% em inglês. Não é bug funcional (aplicação/model já refletem exatamente isso), mas é uma inconsistência de convenção isolada — registrada aqui, sem correção automática nesta rodada (exigiria migration + ajuste de model/frontend, fora do escopo de reconferência).

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | INTEGER | NÃO | auto-increment | **PK** |
| `nome` | VARCHAR(100) | NÃO | - | UQ |
| `descricao` | TEXT | sim | - | - |
| `allowed_warehouses` | JSONB | sim | - | - |
| `active` | BOOLEAN | NÃO | true | - |
| `created_at` | TIMESTAMP WITH TIME ZONE | NÃO | CURRENT_TIMESTAMP | - |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NÃO | CURRENT_TIMESTAMP | - |

## `accounts_payable`

Contas a Pagar — manual ou automática (pós-recebimento de compra), com centro de custo opcional.

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | INTEGER | NÃO | auto-increment | **PK** |
| `description` | VARCHAR(200) | NÃO | - | - |
| `amount` | NUMERIC(10,2) | NÃO | - | - |
| `due_date` | DATE | NÃO | - | - |
| `payment_date` | DATE | sim | - | - |
| `status` | enum_accounts_payable_status | sim | 'pending'::enum_accounts_payable_status | - |
| `category` | VARCHAR(100) | sim | - | - |
| `supplier_id` | INTEGER | sim | - | FK → `suppliers.id` |
| `purchase_id` | INTEGER | sim | - | FK → `purchase_orders.id` |
| `invoice_number` | VARCHAR(50) | sim | - | - |
| `barcode` | VARCHAR(50) | sim | - | - |
| `payment_type` | enum_accounts_payable_payment_type | sim | - | - |
| `cost_center` | VARCHAR(100) | sim | - | - |
| `notes` | TEXT | sim | - | - |
| `approved_by` | INTEGER | sim | - | FK → `users.id` |
| `approval_date` | DATE | sim | - | - |
| `created_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |
| `amount_paid` | NUMERIC(10,2) | NÃO | 0 | - |
| `invoice_type` | enum_accounts_payable_invoice_type | sim | - | - |
| `cost_center_id` | INTEGER | sim | - | FK → `cost_centers.id` |

## `accounts_receivable`

Contas a Receber — origem em vendas, controle de inadimplência.

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | INTEGER | NÃO | auto-increment | **PK** |
| `sale_id` | INTEGER | sim | - | FK → `sales.id` |
| `customer_id` | INTEGER | NÃO | - | FK → `clients.id` |
| `installment` | INTEGER | sim | 1 | - |
| `amount` | NUMERIC(10,2) | NÃO | - | - |
| `due_date` | DATE | NÃO | - | - |
| `payment_date` | DATE | sim | - | - |
| `status` | enum_accounts_receivable_status | sim | 'pending'::enum_accounts_receivable_s... | - |
| `payment_method` | VARCHAR(30) | sim | - | - |
| `invoice_number` | VARCHAR(50) | sim | - | - |
| `barcode` | VARCHAR(50) | sim | - | - |
| `pix_key` | VARCHAR(100) | sim | - | - |
| `interest` | NUMERIC(10,2) | sim | 0 | - |
| `fine` | NUMERIC(10,2) | sim | 0 | - |
| `discount` | NUMERIC(10,2) | sim | 0 | - |
| `collection_status` | enum_accounts_receivable_collection_status | sim | 'normal'::enum_accounts_receivable_co... | - |
| `protest_date` | DATE | sim | - | - |
| `negativation_date` | DATE | sim | - | - |
| `notes` | TEXT | sim | - | - |
| `created_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |
| `amount_paid` | NUMERIC(10,2) | NÃO | 0 | - |
| `cost_center_id` | INTEGER | sim | - | FK → `cost_centers.id` |

## `acoustic_test_results`

Resultados de teste acústico (Thiele-Small, THD, potência etc.), com débito de amostra destrutiva.

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | INTEGER | NÃO | auto-increment | **PK** |
| `product_id` | INTEGER | NÃO | - | FK → `products.id` |
| `serial_number` | VARCHAR(50) | sim | - | - |
| `lot_number` | VARCHAR(80) | sim | - | - |
| `production_order_id` | INTEGER | sim | - | FK → `production_orders.id` |
| `test_type` | enum_acoustic_test_results_test_type | NÃO | - | - |
| `test_date` | TIMESTAMP WITH TIME ZONE | NÃO | CURRENT_TIMESTAMP | - |
| `tester_id` | INTEGER | NÃO | - | FK → `users.id` |
| `parameters` | JSONB | sim | - | - |
| `result` | NUMERIC(12,4) | sim | - | - |
| `unit` | VARCHAR(20) | sim | - | - |
| `specification_min` | NUMERIC(12,4) | sim | - | - |
| `specification_max` | NUMERIC(12,4) | sim | - | - |
| `passed` | BOOLEAN | NÃO | - | - |
| `curve_data` | JSONB | sim | - | - |
| `notes` | TEXT | sim | - | - |
| `non_conformity_id` | INTEGER | sim | - | FK → `non_conformities.id` |
| `created_at` | TIMESTAMP WITH TIME ZONE | NÃO | CURRENT_TIMESTAMP | - |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NÃO | CURRENT_TIMESTAMP | - |
| `consumed_quantity` | NUMERIC(18,6) | sim | - | - |

## `assets`

Patrimônio — ativos com QR Code, depreciação, responsável e departamento.

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | INTEGER | NÃO | auto-increment | **PK** |
| `tag` | VARCHAR(20) | NÃO | - | UQ |
| `name` | VARCHAR(200) | NÃO | - | - |
| `description` | TEXT | sim | - | - |
| `product_id` | INTEGER | sim | - | FK → `products.id` |
| `department_id` | INTEGER | sim | - | FK → `departments.id` |
| `responsible_id` | INTEGER | sim | - | FK → `employees.id` |
| `location` | VARCHAR(100) | sim | - | - |
| `asset_type` | enum_assets_asset_type | sim | 'equipment'::enum_assets_asset_type | - |
| `brand` | VARCHAR(100) | sim | - | - |
| `model` | VARCHAR(100) | sim | - | - |
| `serial_number` | VARCHAR(100) | sim | - | - |
| `purchase_date` | DATE | sim | - | - |
| `purchase_value` | NUMERIC(10,2) | sim | - | - |
| `current_value` | NUMERIC(10,2) | sim | - | - |
| `useful_life_months` | INTEGER | sim | - | - |
| `status` | enum_assets_status | sim | 'active'::enum_assets_status | - |
| `qr_code` | VARCHAR(255) | sim | - | - |
| `notes` | TEXT | sim | - | - |
| `last_inventory_date` | DATE | sim | - | - |
| `created_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |
| `photo_path` | VARCHAR(500) | sim | - | - |
| `license_expires_at` | DATE | sim | - | - |
| `purchase_item_id` | INTEGER | sim | - | FK → `purchase_order_items.id` |

## `audit_logs`

Log de auditoria de alterações em dados sensíveis (schema em uso).

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | INTEGER | NÃO | auto-increment | **PK** |
| `user_id` | INTEGER | sim | - | FK → `users.id` |
| `user_name` | VARCHAR(200) | sim | - | - |
| `user_ip` | VARCHAR(45) | sim | - | - |
| `user_agent` | VARCHAR(255) | sim | - | - |
| `action` | enum_audit_logs_action | NÃO | - | - |
| `entity_type` | VARCHAR(50) | NÃO | - | - |
| `entity_id` | INTEGER | sim | - | - |
| `entity_description` | VARCHAR(255) | sim | - | - |
| `old_values` | JSON | sim | - | - |
| `new_values` | JSON | sim | - | - |
| `description` | TEXT | sim | - | - |
| `success` | BOOLEAN | sim | true | - |
| `error_message` | TEXT | sim | - | - |
| `route` | VARCHAR(100) | sim | - | - |
| `method` | VARCHAR(10) | sim | - | - |
| `created_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |

## `auditoria_eventos` `[DEPRECATED]`

[ÓRFÃ/DEPRECATED] Equivalente em português nunca adotado — usar `audit_logs`.

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | UUID | NÃO | gen_random_uuid() | **PK** |
| `entidade` | VARCHAR(80) | NÃO | - | - |
| `entidade_id` | UUID | NÃO | - | - |
| `acao` | VARCHAR(80) | NÃO | - | - |
| `usuario_id` | INTEGER | sim | - | FK → `users.id` |
| `antes` | JSONB | sim | - | - |
| `depois` | JSONB | sim | - | - |
| `correlation_id` | UUID | NÃO | gen_random_uuid() | - |
| `criado_em` | TIMESTAMP WITH TIME ZONE | NÃO | now() | - |

## `bank_statement_entries`

Lançamentos individuais do extrato OFX, com sugestão/baixa de match contra AP/AR.

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | INTEGER | NÃO | auto-increment | **PK** |
| `statement_id` | INTEGER | NÃO | - | FK → `bank_statements.id` |
| `entry_date` | DATE | NÃO | - | - |
| `amount` | NUMERIC(12,2) | NÃO | - | - |
| `description` | VARCHAR(255) | sim | - | - |
| `fitid` | VARCHAR(100) | NÃO | - | - |
| `status` | enum_bank_statement_entries_status | NÃO | 'pending'::enum_bank_statement_entrie... | - |
| `matched_payable_id` | INTEGER | sim | - | FK → `accounts_payable.id` |
| `matched_receivable_id` | INTEGER | sim | - | FK → `accounts_receivable.id` |
| `matched_by` | INTEGER | sim | - | FK → `users.id` |
| `matched_at` | TIMESTAMP WITH TIME ZONE | sim | - | - |
| `created_at` | TIMESTAMP WITH TIME ZONE | NÃO | CURRENT_TIMESTAMP | - |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NÃO | CURRENT_TIMESTAMP | - |

## `bank_statements`

Extrato bancário OFX importado (um registro por arquivo).

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | INTEGER | NÃO | auto-increment | **PK** |
| `filename` | VARCHAR(255) | NÃO | - | - |
| `bank_name` | VARCHAR(150) | sim | - | - |
| `account_number` | VARCHAR(60) | sim | - | - |
| `period_start` | DATE | sim | - | - |
| `period_end` | DATE | sim | - | - |
| `imported_by` | INTEGER | NÃO | - | FK → `users.id` |
| `created_at` | TIMESTAMP WITH TIME ZONE | NÃO | CURRENT_TIMESTAMP | - |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NÃO | CURRENT_TIMESTAMP | - |

## `bill_of_material_items`

Componentes de uma BOM legada, dual-read `product_id`/`item_id`.

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | INTEGER | NÃO | auto-increment | **PK** |
| `bom_id` | INTEGER | NÃO | - | FK → `bill_of_materials.id` |
| `component_product_id` | INTEGER | NÃO | - | FK → `products.id` |
| `quantity` | NUMERIC(12,4) | NÃO | 1 | - |
| `unit` | VARCHAR(10) | sim | 'un'::character varying | - |
| `bom_level` | INTEGER | sim | 1 | - |
| `parent_item_id` | INTEGER | sim | - | FK → `bill_of_material_items.id` |
| `sequence_order` | INTEGER | sim | 0 | - |
| `component_type` | enum_bill_of_material_items_component_type | sim | 'component'::enum_bill_of_material_it... | - |
| `scrap_percentage` | NUMERIC(5,2) | sim | 0 | - |
| `unit_cost` | NUMERIC(12,2) | sim | 0 | - |
| `total_cost` | NUMERIC(12,2) | sim | 0 | - |
| `notes` | TEXT | sim | - | - |
| `alternative_product_id` | INTEGER | sim | - | FK → `products.id` |
| `is_critical` | BOOLEAN | sim | false | - |
| `created_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |
| `item_id` | UUID | sim | - | FK → `items.id` |

## `bill_of_materials`

BOM do schema `products` legado (cabeçalho).

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | INTEGER | NÃO | auto-increment | **PK** |
| `product_id` | INTEGER | NÃO | - | FK → `products.id` |
| `revision` | VARCHAR(10) | sim | '00'::character varying | - |
| `revision_date` | DATE | sim | - | - |
| `revision_notes` | TEXT | sim | - | - |
| `status` | enum_bill_of_materials_status | sim | 'draft'::enum_bill_of_materials_status | - |
| `created_by` | INTEGER | sim | - | FK → `users.id` |
| `approved_by` | INTEGER | sim | - | FK → `users.id` |
| `approval_date` | DATE | sim | - | - |
| `notes` | TEXT | sim | - | - |
| `total_components` | INTEGER | sim | 0 | - |
| `total_cost` | NUMERIC(12,2) | sim | 0 | - |
| `manufacturing_time_minutes` | INTEGER | sim | 0 | - |
| `created_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |

## `clients`

Clientes (schema mais novo) — usado por `customer_price_lists`, `service_orders`.

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | INTEGER | NÃO | auto-increment | **PK** |
| `name` | VARCHAR(200) | NÃO | - | - |
| `cpf_cnpj` | VARCHAR(18) | NÃO | - | UQ |
| `phone` | VARCHAR(20) | sim | ''::character varying | - |
| `email` | VARCHAR(100) | sim | ''::character varying | - |
| `cep` | VARCHAR(10) | sim | - | - |
| `street` | VARCHAR(200) | sim | - | - |
| `number` | VARCHAR(20) | sim | - | - |
| `complement` | VARCHAR(100) | sim | - | - |
| `neighborhood` | VARCHAR(100) | sim | - | - |
| `city` | VARCHAR(100) | sim | - | - |
| `state` | VARCHAR(2) | sim | - | - |
| `status` | enum_clients_status | sim | 'active'::enum_clients_status | - |
| `notes` | TEXT | sim | ''::text | - |
| `tax_regime` | enum_clients_tax_regime | sim | - | - |
| `ie` | VARCHAR(20) | sim | - | - |
| `im` | VARCHAR(20) | sim | - | - |
| `ind_final` | enum_clients_ind_final | sim | '0'::enum_clients_ind_final | - |
| `ind_ie` | enum_clients_ind_ie | sim | '9'::enum_clients_ind_ie | - |
| `cnae` | VARCHAR(10) | sim | - | - |
| `created_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |
| `city_ibge_code` | VARCHAR(7) | sim | - | - |

## `company_fiscal_config`

Configuração fiscal do emitente (singleton) — razão social, CNPJ, dados de NF-e.

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | INTEGER | NÃO | auto-increment | **PK** |
| `legal_name` | VARCHAR(200) | NÃO | - | - |
| `trade_name` | VARCHAR(200) | sim | - | - |
| `cnpj` | VARCHAR(18) | NÃO | - | - |
| `ie` | VARCHAR(20) | sim | - | - |
| `im` | VARCHAR(20) | sim | - | - |
| `crt` | enum_company_fiscal_config_crt | NÃO | '3'::enum_company_fiscal_config_crt | - |
| `cnae` | VARCHAR(10) | sim | - | - |
| `cep` | VARCHAR(10) | sim | - | - |
| `street` | VARCHAR(200) | sim | - | - |
| `number` | VARCHAR(20) | sim | - | - |
| `complement` | VARCHAR(100) | sim | - | - |
| `neighborhood` | VARCHAR(100) | sim | - | - |
| `city` | VARCHAR(100) | sim | - | - |
| `city_ibge_code` | VARCHAR(7) | sim | - | - |
| `state` | VARCHAR(2) | sim | - | - |
| `nfe_series` | INTEGER | NÃO | 1 | - |
| `nfe_next_number` | INTEGER | NÃO | 1 | - |
| `nfe_environment` | enum_company_fiscal_config_nfe_environment | NÃO | 'homologacao'::enum_company_fiscal_co... | - |
| `nfe_provider` | enum_company_fiscal_config_nfe_provider | NÃO | 'mock'::enum_company_fiscal_config_nf... | - |
| `created_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |

## `cost_centers`

Centros de Custo — usados para agrupar contas a pagar/receber em relatórios.

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | INTEGER | NÃO | auto-increment | **PK** |
| `code` | VARCHAR(30) | NÃO | - | UQ |
| `name` | VARCHAR(100) | NÃO | - | - |
| `description` | TEXT | sim | - | - |
| `active` | BOOLEAN | NÃO | true | - |
| `created_at` | TIMESTAMP WITH TIME ZONE | NÃO | CURRENT_TIMESTAMP | - |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NÃO | CURRENT_TIMESTAMP | - |

## `customer_price_lists`

Tabela de preços negociados por par cliente × produto, com vigência opcional.

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | INTEGER | NÃO | auto-increment | **PK** |
| `customer_id` | INTEGER | NÃO | - | FK → `clients.id` |
| `product_id` | INTEGER | NÃO | - | FK → `products.id` |
| `unit_price` | NUMERIC(10,2) | NÃO | - | - |
| `currency` | VARCHAR(3) | NÃO | 'BRL'::character varying | - |
| `valid_from` | DATE | sim | - | - |
| `valid_until` | DATE | sim | - | - |
| `active` | BOOLEAN | NÃO | true | - |
| `created_by` | INTEGER | sim | - | FK → `users.id` |
| `created_at` | TIMESTAMP WITH TIME ZONE | NÃO | CURRENT_TIMESTAMP | - |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NÃO | CURRENT_TIMESTAMP | - |

## `departments`

Departamentos organizacionais (21 no organograma).

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | INTEGER | NÃO | auto-increment | **PK** |
| `code` | VARCHAR(10) | NÃO | - | - |
| `name` | VARCHAR(100) | NÃO | - | - |
| `sigla` | VARCHAR(10) | NÃO | - | - |
| `description` | TEXT | sim | - | - |
| `manager_id` | INTEGER | sim | - | FK → `employees.id` |
| `active` | BOOLEAN | sim | true | - |
| `created_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |

## `employees`

Funcionários (RH) — vinculados a um usuário e departamento.

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | INTEGER | NÃO | auto-increment | **PK** |
| `user_id` | INTEGER | sim | - | FK → `users.id` |
| `department_id` | INTEGER | NÃO | - | FK → `departments.id` |
| `name` | VARCHAR(200) | NÃO | - | - |
| `cpf` | VARCHAR(14) | NÃO | - | UQ |
| `rg` | VARCHAR(20) | sim | - | - |
| `pis_pasep` | VARCHAR(20) | sim | - | - |
| `ctps` | VARCHAR(20) | sim | - | - |
| `phone` | VARCHAR(20) | sim | - | - |
| `email` | VARCHAR(100) | sim | - | - |
| `address` | TEXT | sim | - | - |
| `position` | VARCHAR(100) | sim | - | - |
| `salary` | NUMERIC(10,2) | sim | 0 | - |
| `salary_type` | enum_employees_salary_type | sim | 'mensal'::enum_employees_salary_type | - |
| `hire_date` | DATE | NÃO | - | - |
| `dismissal_date` | DATE | sim | - | - |
| `status` | enum_employees_status | sim | 'active'::enum_employees_status | - |
| `shift` | enum_employees_shift | sim | 'commercial'::enum_employees_shift | - |
| `work_regime` | enum_employees_work_regime | sim | 'clt'::enum_employees_work_regime | - |
| `work_hours_weekly` | INTEGER | sim | 44 | - |
| `bank_name` | VARCHAR(100) | sim | - | - |
| `bank_agency` | VARCHAR(10) | sim | - | - |
| `bank_account` | VARCHAR(20) | sim | - | - |
| `bank_account_type` | enum_employees_bank_account_type | sim | 'corrente'::enum_employees_bank_accou... | - |
| `pix_key` | VARCHAR(100) | sim | - | - |
| `education_level` | VARCHAR(50) | sim | - | - |
| `emergency_contact` | VARCHAR(100) | sim | - | - |
| `emergency_phone` | VARCHAR(20) | sim | - | - |
| `notes` | TEXT | sim | - | - |
| `photo_url` | VARCHAR(255) | sim | - | - |
| `created_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |

## `engineering_projects`

Projetos de Engenharia/P&D (PDP: concept→design→prototype→testing→homologation→production).

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | INTEGER | NÃO | auto-increment | **PK** |
| `project_code` | VARCHAR(20) | NÃO | - | UQ |
| `name` | VARCHAR(200) | NÃO | - | - |
| `description` | TEXT | sim | - | - |
| `project_type` | enum_engineering_projects_project_type | NÃO | 'new_product'::enum_engineering_proje... | - |
| `product_id` | INTEGER | sim | - | FK → `products.id` |
| `project_manager_id` | INTEGER | sim | - | FK → `users.id` |
| `start_date` | DATE | sim | - | - |
| `target_date` | DATE | sim | - | - |
| `completion_date` | DATE | sim | - | - |
| `budget` | NUMERIC(15,2) | sim | - | - |
| `actual_cost` | NUMERIC(15,2) | NÃO | 0 | - |
| `stage` | enum_engineering_projects_stage | NÃO | 'concept'::enum_engineering_projects_... | - |
| `status` | enum_engineering_projects_status | NÃO | 'active'::enum_engineering_projects_s... | - |
| `priority` | enum_engineering_projects_priority | NÃO | 'normal'::enum_engineering_projects_p... | - |
| `notes` | TEXT | sim | - | - |
| `created_at` | TIMESTAMP WITH TIME ZONE | NÃO | CURRENT_TIMESTAMP | - |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NÃO | CURRENT_TIMESTAMP | - |

## `entradas_nf` `[DEPRECATED]`

[ÓRFÃ/DEPRECATED] Equivalente em português nunca adotado — usar `purchase_receipts`.

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | UUID | NÃO | gen_random_uuid() | **PK** |
| `fornecedor_id` | UUID | sim | - | FK → `fornecedores.id`, UQ |
| `numero_nf` | VARCHAR(80) | NÃO | - | UQ |
| `chave_acesso` | VARCHAR(80) | sim | - | - |
| `recebido_por` | INTEGER | sim | - | FK → `users.id` |
| `recebido_em` | TIMESTAMP WITH TIME ZONE | NÃO | now() | - |

## `entradas_nf_items` `[DEPRECATED]`

[ÓRFÃ/DEPRECATED] Equivalente em português nunca adotado — usar `purchase_receipts`.

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | UUID | NÃO | gen_random_uuid() | **PK** |
| `entrada_nf_id` | UUID | NÃO | - | FK → `entradas_nf.id` |
| `item_id` | UUID | NÃO | - | - |
| `lote_id` | UUID | sim | - | FK → `lotes.id` |
| `quantidade` | NUMERIC(18,6) | NÃO | - | - |
| `custo_unitario` | NUMERIC(18,6) | NÃO | 0 | - |

## `fornecedores` `[DEPRECATED]`

[ÓRFÃ/DEPRECATED] Equivalente em português nunca adotado — usar `suppliers`.

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | UUID | NÃO | gen_random_uuid() | **PK** |
| `razao_social` | VARCHAR(180) | NÃO | - | - |
| `cnpj` | VARCHAR(20) | sim | - | UQ |
| `email` | VARCHAR(180) | sim | - | - |
| `telefone` | VARCHAR(40) | sim | - | - |
| `ativo` | BOOLEAN | NÃO | true | - |
| `criado_em` | TIMESTAMP WITH TIME ZONE | NÃO | now() | - |
| `atualizado_em` | TIMESTAMP WITH TIME ZONE | NÃO | now() | - |

## `import_process_items`

Itens de um Processo de Importação — quantidade, valor FOB unitário em moeda estrangeira, alíquotas de II/IPI/PIS/COFINS/ICMS informadas manualmente pelo Analista de Comex, e os valores calculados (`ImportTaxCalculator`): valor aduaneiro rateado, tributos (II/IPI/PIS/COFINS/ICMS "por dentro") e custo unitário nacionalizado final — usado na entrada de estoque. FK para `items` (núcleo canônico), não para `products` legado.

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | INTEGER | NÃO | auto-increment | **PK** |
| `import_process_id` | INTEGER | NÃO | - | FK → `import_processes.id` |
| `item_id` | UUID | NÃO | - | FK → `items.id` |
| `quantity` | NUMERIC(18,6) | NÃO | - | - |
| `fob_unit_price` | NUMERIC(18,6) | NÃO | - | - |
| `ii_rate` | NUMERIC(7,4) | NÃO | 0 | - |
| `ipi_rate` | NUMERIC(7,4) | NÃO | 0 | - |
| `pis_rate` | NUMERIC(7,4) | NÃO | 0 | - |
| `cofins_rate` | NUMERIC(7,4) | NÃO | 0 | - |
| `icms_rate` | NUMERIC(7,4) | NÃO | 0 | - |
| `customs_value` | NUMERIC(18,6) | sim | - | - |
| `ii_value` | NUMERIC(18,6) | sim | - | - |
| `ipi_value` | NUMERIC(18,6) | sim | - | - |
| `pis_value` | NUMERIC(18,6) | sim | - | - |
| `cofins_value` | NUMERIC(18,6) | sim | - | - |
| `icms_value` | NUMERIC(18,6) | sim | - | - |
| `nationalized_unit_cost` | NUMERIC(18,6) | sim | - | - |
| `created_at` | TIMESTAMP WITH TIME ZONE | NÃO | CURRENT_TIMESTAMP | - |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NÃO | CURRENT_TIMESTAMP | - |

## `import_processes`

Processo de Importação/COMEX (UC-19) — cabeçalho: número `IMP-<ano>-XXXX`, fornecedor internacional (reutiliza `suppliers`, sem cadastro dedicado), status de acompanhamento (draft→shipped→arrived→customs_cleared→received, ou cancelled), câmbio (`exchange_rate`) e despesas em BRL (frete/seguro/outras) usadas no rateio pro-rata do valor aduaneiro entre os itens. Sem integração Siscomex/NCM (alíquotas informadas manualmente).

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | INTEGER | NÃO | auto-increment | **PK** |
| `process_number` | VARCHAR(60) | NÃO | - | UQ |
| `supplier_id` | INTEGER | NÃO | - | FK → `suppliers.id` |
| `status` | enum_import_processes_status | NÃO | 'draft'::enum_import_processes_status | - |
| `fob_currency` | VARCHAR(3) | NÃO | 'USD'::character varying | - |
| `exchange_rate` | NUMERIC(18,6) | NÃO | 1 | - |
| `freight_value` | NUMERIC(18,6) | NÃO | 0 | - |
| `insurance_value` | NUMERIC(18,6) | NÃO | 0 | - |
| `other_expenses_value` | NUMERIC(18,6) | NÃO | 0 | - |
| `shipped_at` | DATE | sim | - | - |
| `arrived_at` | DATE | sim | - | - |
| `customs_cleared_at` | DATE | sim | - | - |
| `received_at` | DATE | sim | - | - |
| `notes` | TEXT | sim | - | - |
| `created_by` | INTEGER | NÃO | - | FK → `users.id` |
| `created_at` | TIMESTAMP WITH TIME ZONE | NÃO | CURRENT_TIMESTAMP | - |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NÃO | CURRENT_TIMESTAMP | - |

## `inventory_count_items`

Itens de uma contagem cíclica — saldo esperado vs contado, dual-read `product_id`/`item_id`.

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | INTEGER | NÃO | auto-increment | **PK** |
| `inventory_count_id` | INTEGER | NÃO | - | FK → `inventory_counts.id` |
| `product_id` | INTEGER | sim | - | FK → `products.id` |
| `system_quantity` | NUMERIC(12,3) | NÃO | 0 | - |
| `counted_quantity` | NUMERIC(12,3) | sim | - | - |
| `variance_quantity` | NUMERIC(12,3) | sim | - | - |
| `status` | enum_inventory_count_items_status | NÃO | 'pending'::enum_inventory_count_items... | - |
| `counted_by` | INTEGER | sim | - | FK → `users.id` |
| `counted_at` | TIMESTAMP WITH TIME ZONE | sim | - | - |
| `notes` | TEXT | sim | - | - |
| `created_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |
| `item_id` | UUID | sim | - | FK → `items.id` |

## `inventory_counts`

Contagem cíclica de inventário (cabeçalho) — depósito, atribuição (pool/funcionário), departamento.

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | INTEGER | NÃO | auto-increment | **PK** |
| `count_number` | VARCHAR(30) | NÃO | - | UQ |
| `status` | enum_inventory_counts_status | NÃO | 'draft'::enum_inventory_counts_status | - |
| `count_type` | enum_inventory_counts_count_type | NÃO | 'cycle'::enum_inventory_counts_count_... | - |
| `location` | VARCHAR(100) | sim | - | - |
| `started_at` | TIMESTAMP WITH TIME ZONE | sim | - | - |
| `completed_at` | TIMESTAMP WITH TIME ZONE | sim | - | - |
| `approved_at` | TIMESTAMP WITH TIME ZONE | sim | - | - |
| `created_by` | INTEGER | NÃO | - | FK → `users.id` |
| `approved_by` | INTEGER | sim | - | FK → `users.id` |
| `notes` | TEXT | sim | - | - |
| `created_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |
| `warehouse_id` | INTEGER | sim | - | FK → `warehouses.id` |
| `assigned_to` | INTEGER | sim | - | FK → `users.id` |
| `department_id` | INTEGER | sim | - | FK → `departments.id` |

## `inventory_movements`

Movimentações de estoque (entrada/saída/ajuste/transferência), dual-read `product_id`/`item_id`.

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | INTEGER | NÃO | auto-increment | **PK** |
| `product_id` | INTEGER | NÃO | - | FK → `products.id` |
| `user_id` | INTEGER | NÃO | - | FK → `users.id` |
| `type` | enum_inventory_movements_type | NÃO | - | - |
| `quantity` | NUMERIC(18,6) | NÃO | - | - |
| `unit_cost` | NUMERIC(10,2) | sim | 0 | - |
| `description` | TEXT | sim | - | - |
| `reference_id` | INTEGER | sim | - | - |
| `reference_type` | enum_inventory_movements_reference_type | sim | - | - |
| `created_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |
| `item_id` | UUID | sim | - | FK → `items.id` |
| `warehouse_id` | INTEGER | sim | - | FK → `warehouses.id` |

## `item_categorias`

Categorias do novo modelo `items` (N:1).

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | UUID | NÃO | - | **PK** |
| `codigo` | VARCHAR(50) | NÃO | - | UQ |
| `descricao` | VARCHAR(240) | NÃO | - | - |
| `criado_em` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |
| `atualizado_em` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |

## `item_detalhes_comerciais`

Extensão 1:1 obrigatória de `items` — preço, NCM/CEST, peso, localização, desenho.

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `item_id` | UUID | NÃO | - | **PK**, FK → `items.id` |
| `preco_venda` | NUMERIC(14,2) | NÃO | 0 | - |
| `categoria_id` | UUID | sim | - | FK → `item_categorias.id` |
| `ncm` | VARCHAR(10) | NÃO | '85182100'::character varying | - |
| `cest` | VARCHAR(10) | sim | - | - |
| `peso_kg` | NUMERIC(10,3) | NÃO | 0 | - |
| `localizacao_estoque` | VARCHAR(100) | sim | - | - |
| `numero_desenho` | VARCHAR(50) | sim | - | - |
| `revisao_tecnica` | VARCHAR(10) | NÃO | '00'::character varying | - |
| `lote_rastreabilidade` | VARCHAR(50) | sim | - | - |
| `numero_serie` | VARCHAR(80) | sim | - | - |
| `criado_em` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |
| `atualizado_em` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |

## `item_especificacoes_tecnicas`

Extensão 1:1 opcional de `items` — 13 parâmetros Thiele-Small (JSONB) e família técnica.

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `item_id` | UUID | NÃO | - | **PK**, FK → `items.id` |
| `familia_tecnica` | VARCHAR(40) | NÃO | - | - |
| `atributos` | JSONB | NÃO | '{}'::jsonb | - |
| `criado_em` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |
| `atualizado_em` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |

## `item_estruturas`

BOM (estrutura de produto) do modelo `items` — hierarquia multi-nível, componentes, perdas %.

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | UUID | NÃO | - | **PK** |
| `item_pai_id` | UUID | NÃO | - | FK → `items.id` |
| `item_componente_id` | UUID | NÃO | - | FK → `items.id` |
| `quantidade` | NUMERIC(18,6) | NÃO | - | - |
| `perda_percentual` | NUMERIC(9,6) | NÃO | 0 | - |
| `nivel` | INTEGER | NÃO | 1 | - |
| `sequencia` | INTEGER | NÃO | 0 | - |
| `ativo` | BOOLEAN | NÃO | true | - |
| `revisao` | VARCHAR(20) | NÃO | '00'::character varying | - |
| `observacoes` | TEXT | sim | - | - |
| `criado_por` | INTEGER | sim | - | FK → `users.id` |
| `status` | enum_item_estruturas_status | NÃO | 'active'::enum_item_estruturas_status | - |
| `approved_by` | INTEGER | sim | - | FK → `users.id` |
| `approval_date` | DATE | sim | - | - |
| `unit_cost` | NUMERIC(18,6) | NÃO | 0 | - |
| `total_cost` | NUMERIC(18,6) | NÃO | 0 | - |
| `parent_item_estrutura_id` | UUID | sim | - | FK → `item_estruturas.id` |
| `component_type` | enum_item_estruturas_component_type | NÃO | 'component'::enum_item_estruturas_com... | - |
| `is_critical` | BOOLEAN | NÃO | false | - |
| `alternative_product_id` | UUID | sim | - | FK → `items.id` |
| `criado_em` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |
| `atualizado_em` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |

## `item_suppliers`

Catálogo N:N item × fornecedor (preço de referência, lead time, MOQ, preferencial).

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | INTEGER | NÃO | auto-increment | **PK** |
| `item_id` | UUID | NÃO | - | FK → `items.id`, UQ |
| `supplier_id` | INTEGER | NÃO | - | FK → `suppliers.id`, UQ |
| `unit_price` | NUMERIC(18,6) | sim | - | - |
| `currency` | VARCHAR(3) | NÃO | 'BRL'::character varying | - |
| `lead_time_days` | INTEGER | sim | - | - |
| `moq` | NUMERIC(18,6) | sim | - | - |
| `supplier_item_code` | VARCHAR(80) | sim | - | - |
| `preferred` | BOOLEAN | NÃO | false | - |
| `active` | BOOLEAN | NÃO | true | - |
| `notes` | TEXT | sim | - | - |
| `created_at` | TIMESTAMP WITH TIME ZONE | NÃO | CURRENT_TIMESTAMP | - |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NÃO | CURRENT_TIMESTAMP | - |

## `items`

Item Mestre Canônico (novo núcleo, UUID) — 12 colunas críticas de MRP, nunca alteradas por extensões.

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | UUID | NÃO | - | **PK** |
| `codigo` | VARCHAR(80) | NÃO | - | UQ |
| `descricao` | VARCHAR(240) | NÃO | - | - |
| `tipo` | enum_items_tipo | NÃO | - | - |
| `unidade` | VARCHAR(12) | NÃO | - | - |
| `status` | enum_items_status | NÃO | 'ATIVO'::enum_items_status | - |
| `estoque_atual` | NUMERIC(18,6) | NÃO | 0 | - |
| `estoque_reservado` | NUMERIC(18,6) | NÃO | 0 | - |
| `estoque_seguranca` | NUMERIC(18,6) | NÃO | 0 | - |
| `lote_minimo` | NUMERIC(18,6) | NÃO | 0 | - |
| `lead_time_dias` | INTEGER | NÃO | 0 | - |
| `custo_padrao` | NUMERIC(18,6) | NÃO | 0 | - |
| `fornecedor_padrao_id` | INTEGER | sim | - | FK → `suppliers.id` |
| `criado_em` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |
| `atualizado_em` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |
| `conversao_automatica` | BOOLEAN | NÃO | false | - |

## `lot_controls`

Rastreabilidade de lotes (matéria-prima e produto acabado) — inclui quarentena de qualidade.

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | INTEGER | NÃO | auto-increment | **PK** |
| `product_id` | INTEGER | NÃO | - | FK → `products.id` |
| `supplier_id` | INTEGER | sim | - | FK → `suppliers.id` |
| `purchase_id` | INTEGER | sim | - | FK → `purchase_orders.id` |
| `production_order_id` | INTEGER | sim | - | FK → `production_orders.id` |
| `lot_number` | VARCHAR(80) | NÃO | - | - |
| `status` | enum_lot_controls_status | NÃO | 'available'::enum_lot_controls_status | - |
| `quantity_initial` | NUMERIC(12,4) | NÃO | - | - |
| `quantity_available` | NUMERIC(12,4) | NÃO | - | - |
| `manufactured_at` | DATE | sim | - | - |
| `expires_at` | DATE | sim | - | - |
| `received_at` | DATE | sim | - | - |
| `created_by` | INTEGER | sim | - | FK → `users.id` |
| `notes` | TEXT | sim | - | - |
| `created_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |
| `item_id` | UUID | sim | - | FK → `items.id` |
| `warehouse_id` | INTEGER | sim | - | FK → `warehouses.id` |

## `lotes` `[DEPRECATED]`

[ÓRFÃ/DEPRECATED] Equivalente em português nunca adotado — usar `lot_controls`.

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | UUID | NÃO | gen_random_uuid() | **PK** |
| `item_id` | UUID | NÃO | - | UQ |
| `codigo_lote` | VARCHAR(100) | NÃO | - | UQ |
| `quantidade` | NUMERIC(18,6) | NÃO | 0 | - |
| `validade` | DATE | sim | - | - |
| `origem` | VARCHAR(80) | sim | - | - |
| `criado_em` | TIMESTAMP WITH TIME ZONE | NÃO | now() | - |

## `maintenance_orders`

Ordens de manutenção de ativos.

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | INTEGER | NÃO | auto-increment | **PK** |
| `order_number` | VARCHAR(20) | NÃO | - | UQ |
| `asset_id` | INTEGER | NÃO | - | FK → `assets.id` |
| `maintenance_type` | enum_maintenance_orders_maintenance_type | NÃO | - | - |
| `priority` | enum_maintenance_orders_priority | sim | 'normal'::enum_maintenance_orders_pri... | - |
| `problem_description` | TEXT | NÃO | - | - |
| `reported_by` | INTEGER | sim | - | FK → `users.id` |
| `report_date` | DATE | sim | - | - |
| `diagnosed_problem` | TEXT | sim | - | - |
| `diagnosed_by` | INTEGER | sim | - | FK → `users.id` |
| `diagnosis_date` | DATE | sim | - | - |
| `service_performed` | TEXT | sim | - | - |
| `technician_id` | INTEGER | sim | - | FK → `users.id` |
| `start_date` | DATE | sim | - | - |
| `completion_date` | DATE | sim | - | - |
| `parts_cost` | NUMERIC(10,2) | sim | 0 | - |
| `labor_cost` | NUMERIC(10,2) | sim | 0 | - |
| `total_cost` | NUMERIC(10,2) | sim | 0 | - |
| `downtime_hours` | NUMERIC(10,1) | sim | 0 | - |
| `result` | enum_maintenance_orders_result | sim | - | - |
| `notes` | TEXT | sim | - | - |
| `scheduled_date` | DATE | sim | - | - |
| `frequency_days` | INTEGER | sim | - | - |
| `next_maintenance_date` | DATE | sim | - | - |
| `status` | enum_maintenance_orders_status | sim | 'open'::enum_maintenance_orders_status | - |
| `created_by` | INTEGER | sim | - | FK → `users.id` |
| `created_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |

## `migracao_bom_log` `[DEPRECATED]`

[ÓRFÃ/DEPRECATED] Log técnico da migração Product→Item, sem uso em código vivo.

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | UUID | NÃO | gen_random_uuid() | **PK** |
| `bill_of_material_id` | INTEGER | sim | - | - |
| `bill_of_material_item_id` | INTEGER | sim | - | - |
| `item_estrutura_id` | UUID | sim | - | - |
| `status` | VARCHAR(40) | NÃO | 'PENDENTE'::character varying | - |
| `mensagem_erro` | TEXT | sim | - | - |
| `processado_em` | TIMESTAMP WITH TIME ZONE | sim | - | - |
| `criado_em` | TIMESTAMP WITH TIME ZONE | NÃO | now() | - |

## `migracao_categoria_map` `[DEPRECATED]`

[ÓRFÃ/DEPRECATED] Mapa de migração de categorias, sem uso em código vivo.

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `product_category_id` | INTEGER | NÃO | - | UQ |
| `item_categoria_id` | UUID | NÃO | - | FK → `item_categorias.id`, UQ |
| `mapeado_em` | TIMESTAMP WITH TIME ZONE | NÃO | now() | - |

## `migracao_product_item_map` `[DEPRECATED]`

[ÓRFÃ/DEPRECATED] Mapa de migração Product→Item, sem uso em código vivo.

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | UUID | NÃO | gen_random_uuid() | **PK** |
| `product_id` | INTEGER | NÃO | - | UQ |
| `item_id` | UUID | NÃO | - | UQ |
| `product_code` | VARCHAR(50) | sim | - | - |
| `product_name` | VARCHAR(200) | sim | - | - |
| `mapeado_em` | TIMESTAMP WITH TIME ZONE | NÃO | now() | - |
| `status` | VARCHAR(40) | NÃO | 'SUCESSO'::character varying | - |
| `observacoes` | TEXT | sim | - | - |

## `movimentos_estoque` `[DEPRECATED]`

[ÓRFÃ/DEPRECATED] Equivalente em português nunca adotado — usar `inventory_movements`.

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | UUID | NÃO | gen_random_uuid() | **PK** |
| `item_id` | UUID | NÃO | - | - |
| `lote_id` | UUID | sim | - | FK → `lotes.id` |
| `tipo` | movimento_tipo | NÃO | - | - |
| `quantidade` | NUMERIC(18,6) | NÃO | - | - |
| `saldo_antes` | NUMERIC(18,6) | NÃO | - | - |
| `saldo_depois` | NUMERIC(18,6) | NÃO | - | - |
| `origem_tabela` | VARCHAR(80) | NÃO | - | - |
| `origem_id` | UUID | NÃO | - | - |
| `usuario_id` | INTEGER | sim | - | FK → `users.id` |
| `observacoes` | TEXT | sim | - | - |
| `criado_em` | TIMESTAMP WITH TIME ZONE | NÃO | now() | - |

## `mrp_ordens_planejadas`

Ordens planejadas geradas pelo MRP (RASCUNHO/APROVADA), origem para OP ou requisição.

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | UUID | NÃO | - | **PK** |
| `item_id` | UUID | NÃO | - | FK → `items.id` |
| `origem` | enum_mrp_ordens_planejadas_origem | NÃO | - | - |
| `origem_id` | UUID | sim | - | - |
| `necessidade_bruta` | NUMERIC(18,6) | NÃO | - | - |
| `estoque_disponivel` | NUMERIC(18,6) | NÃO | - | - |
| `necessidade_liquida` | NUMERIC(18,6) | NÃO | - | - |
| `quantidade_planejada` | NUMERIC(18,6) | NÃO | - | - |
| `data_necessidade` | DATE | NÃO | - | - |
| `data_liberacao` | DATE | NÃO | - | - |
| `status` | enum_mrp_ordens_planejadas_status | NÃO | 'RASCUNHO'::enum_mrp_ordens_planejada... | - |
| `criado_em` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |

## `non_conformities`

Não-conformidades (RNC) de qualidade — pode bloquear lote e realimentar `quality_score` do fornecedor.

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | INTEGER | NÃO | auto-increment | **PK** |
| `nc_number` | VARCHAR(20) | NÃO | - | UQ |
| `origin` | enum_non_conformities_origin | NÃO | - | - |
| `product_id` | INTEGER | sim | - | FK → `products.id` |
| `purchase_item_id` | INTEGER | sim | - | FK → `purchase_order_items.id` |
| `production_order_id` | INTEGER | sim | - | FK → `production_orders.id` |
| `service_order_id` | INTEGER | sim | - | FK → `service_orders.id` |
| `supplier_id` | INTEGER | sim | - | FK → `suppliers.id` |
| `description` | TEXT | NÃO | - | - |
| `defect_type` | enum_non_conformities_defect_type | NÃO | - | - |
| `severity` | enum_non_conformities_severity | NÃO | - | - |
| `quantity_affected` | INTEGER | sim | 0 | - |
| `immediate_action` | enum_non_conformities_immediate_action | sim | 'rework'::enum_non_conformities_immed... | - |
| `immediate_action_desc` | TEXT | sim | - | - |
| `root_cause` | TEXT | sim | - | - |
| `root_cause_category` | enum_non_conformities_root_cause_category | sim | - | - |
| `corrective_action` | TEXT | sim | - | - |
| `corrective_action_deadline` | DATE | sim | - | - |
| `responsible_id` | INTEGER | sim | - | FK → `users.id` |
| `effectiveness_check` | TEXT | sim | - | - |
| `effectiveness_date` | DATE | sim | - | - |
| `effectiveness_result` | enum_non_conformities_effectiveness_result | sim | - | - |
| `status` | enum_non_conformities_status | sim | 'open'::enum_non_conformities_status | - |
| `lot_number` | VARCHAR(50) | sim | - | - |
| `batch_number` | VARCHAR(50) | sim | - | - |
| `report_date` | DATE | sim | CURRENT_DATE | - |
| `closed_date` | DATE | sim | - | - |
| `scrap_cost` | NUMERIC(10,2) | sim | 0 | - |
| `rework_cost` | NUMERIC(10,2) | sim | 0 | - |
| `total_cost` | NUMERIC(10,2) | sim | 0 | - |
| `reported_by` | INTEGER | NÃO | - | FK → `users.id` |
| `closed_by` | INTEGER | sim | - | FK → `users.id` |
| `notes` | TEXT | sim | - | - |
| `created_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |
| `asset_id` | INTEGER | sim | - | FK → `assets.id` |

## `numeros_serie` `[DEPRECATED]`

[ÓRFÃ/DEPRECATED] Equivalente em português nunca adotado — usar `serial_numbers`.

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | UUID | NÃO | gen_random_uuid() | **PK** |
| `item_id` | UUID | NÃO | - | - |
| `lote_id` | UUID | sim | - | FK → `lotes.id` |
| `numero_serie` | VARCHAR(120) | NÃO | - | UQ |
| `status` | VARCHAR(40) | NÃO | 'DISPONIVEL'::character varying | - |
| `criado_em` | TIMESTAMP WITH TIME ZONE | NÃO | now() | - |

## `ordens_producao` `[DEPRECATED]`

[ÓRFÃ/DEPRECATED] Equivalente em português nunca adotado — usar `production_orders`.

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | UUID | NÃO | gen_random_uuid() | **PK** |
| `codigo` | VARCHAR(60) | NÃO | - | UQ |
| `item_id` | UUID | NÃO | - | - |
| `quantidade_planejada` | NUMERIC(18,6) | NÃO | - | - |
| `quantidade_produzida` | NUMERIC(18,6) | NÃO | 0 | - |
| `status` | ordem_status | NÃO | 'RASCUNHO'::ordem_status | - |
| `data_inicio` | TIMESTAMP WITH TIME ZONE | sim | - | - |
| `data_fim` | TIMESTAMP WITH TIME ZONE | sim | - | - |
| `criado_por` | INTEGER | sim | - | FK → `users.id` |
| `criado_em` | TIMESTAMP WITH TIME ZONE | NÃO | now() | - |
| `atualizado_em` | TIMESTAMP WITH TIME ZONE | NÃO | now() | - |

## `product_categories`

Categorias do schema `products` legado (não confundir com `item_categorias`).

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | INTEGER | NÃO | auto-increment | **PK** |
| `name` | VARCHAR(100) | NÃO | - | UQ |
| `description` | TEXT | sim | ''::text | - |
| `active` | BOOLEAN | sim | true | - |
| `created_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |

## `product_cost_ledgers`

Ledger de custo real ponderado por produto (compra/produção/material/mão-de-obra/overhead/ajuste).

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | INTEGER | NÃO | auto-increment | **PK** |
| `product_id` | INTEGER | NÃO | - | - |
| `source_type` | enum_product_cost_ledgers_source_type | NÃO | - | - |
| `source_id` | INTEGER | sim | - | - |
| `quantity` | NUMERIC(12,4) | NÃO | - | - |
| `unit_cost` | NUMERIC(12,4) | NÃO | - | - |
| `total_cost` | NUMERIC(14,4) | NÃO | - | - |
| `previous_cost` | NUMERIC(12,4) | NÃO | 0 | - |
| `new_cost` | NUMERIC(12,4) | NÃO | 0 | - |
| `created_by` | INTEGER | sim | - | FK → `users.id` |
| `notes` | TEXT | sim | - | - |
| `created_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |

## `product_drawings`

Desenhos técnicos de um produto (revisão, tipo, aprovação).

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | INTEGER | NÃO | auto-increment | **PK** |
| `product_id` | INTEGER | NÃO | - | FK → `products.id` |
| `drawing_number` | VARCHAR(50) | NÃO | - | UQ |
| `revision` | VARCHAR(10) | NÃO | '00'::character varying | UQ |
| `title` | VARCHAR(200) | NÃO | - | - |
| `drawing_type` | enum_product_drawings_drawing_type | NÃO | 'detail'::enum_product_drawings_drawi... | - |
| `file_path` | VARCHAR(255) | sim | - | - |
| `material_spec` | TEXT | sim | - | - |
| `dimensions` | TEXT | sim | - | - |
| `tolerances` | TEXT | sim | - | - |
| `approved_by` | INTEGER | sim | - | FK → `users.id` |
| `approval_date` | DATE | sim | - | - |
| `status` | enum_product_drawings_status | NÃO | 'draft'::enum_product_drawings_status | - |
| `notes` | TEXT | sim | - | - |
| `created_at` | TIMESTAMP WITH TIME ZONE | NÃO | CURRENT_TIMESTAMP | - |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NÃO | CURRENT_TIMESTAMP | - |

## `product_warehouse_stock`

Saldo de produto POR depósito — soma deve bater com `products.quantity` (invariante).

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | INTEGER | NÃO | auto-increment | **PK** |
| `product_id` | INTEGER | NÃO | - | FK → `products.id`, UQ |
| `warehouse_id` | INTEGER | NÃO | - | FK → `warehouses.id`, UQ |
| `quantity` | NUMERIC(18,6) | NÃO | 0 | - |
| `created_at` | TIMESTAMP WITH TIME ZONE | NÃO | CURRENT_TIMESTAMP | - |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NÃO | CURRENT_TIMESTAMP | - |

## `production_cost_settings`

Configuração singleton de custeio (taxa de overhead, taxa de mão-de-obra de fallback).

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | INTEGER | NÃO | auto-increment | **PK** |
| `overhead_calculation_basis` | enum_production_cost_settings_overhead_calculation_basis | NÃO | 'material_labor'::enum_production_cos... | - |
| `overhead_rate_percent` | NUMERIC(9,6) | NÃO | 0 | - |
| `default_labor_rate_per_hour` | NUMERIC(18,6) | NÃO | 0 | - |
| `created_at` | TIMESTAMP WITH TIME ZONE | NÃO | CURRENT_TIMESTAMP | - |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NÃO | CURRENT_TIMESTAMP | - |

## `production_downtimes`

Paradas de máquina/centro de trabalho, categorizadas — alimenta cálculo de OEE.

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | INTEGER | NÃO | auto-increment | **PK** |
| `work_center_id` | INTEGER | NÃO | - | FK → `work_centers.id` |
| `production_order_id` | INTEGER | sim | - | FK → `production_orders.id` |
| `reason` | enum_production_downtimes_reason | NÃO | - | - |
| `notes` | TEXT | sim | - | - |
| `started_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |
| `finished_at` | TIMESTAMP WITH TIME ZONE | sim | - | - |
| `created_by` | INTEGER | NÃO | - | FK → `users.id` |
| `created_at` | TIMESTAMP WITH TIME ZONE | NÃO | CURRENT_TIMESTAMP | - |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NÃO | CURRENT_TIMESTAMP | - |

## `production_lot_consumptions`

Consumo de lotes específicos por uma OP (FEFO).

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | INTEGER | NÃO | auto-increment | **PK** |
| `production_order_id` | INTEGER | NÃO | - | FK → `production_orders.id` |
| `lot_control_id` | INTEGER | NÃO | - | FK → `lot_controls.id` |
| `product_id` | INTEGER | NÃO | - | FK → `products.id` |
| `quantity_consumed` | NUMERIC(12,4) | NÃO | - | - |
| `consumed_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |
| `user_id` | INTEGER | sim | - | FK → `users.id` |
| `notes` | TEXT | sim | - | - |
| `created_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |
| `item_id` | UUID | sim | - | FK → `items.id` |

## `production_order_tracking`

Apontamento de produção por etapa (operador, quantidade boa/refugo, início/fim).

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | INTEGER | NÃO | auto-increment | **PK** |
| `production_order_id` | INTEGER | NÃO | - | FK → `production_orders.id` |
| `production_route_step_id` | INTEGER | sim | - | FK → `production_route_steps.id` |
| `sequence` | INTEGER | NÃO | - | - |
| `status` | enum_production_order_tracking_status | NÃO | 'pending'::enum_production_order_trac... | - |
| `started_at` | TIMESTAMP WITH TIME ZONE | sim | - | - |
| `finished_at` | TIMESTAMP WITH TIME ZONE | sim | - | - |
| `operator_id` | INTEGER | sim | - | FK → `employees.id` |
| `quantity_good` | NUMERIC(18,6) | NÃO | 0 | - |
| `quantity_scrapped` | NUMERIC(18,6) | NÃO | 0 | - |
| `notes` | TEXT | sim | - | - |
| `created_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |

## `production_orders`

Ordem de Produção (OP) — planned→released→in_progress→completed, vínculo com venda.

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | INTEGER | NÃO | auto-increment | **PK** |
| `order_number` | VARCHAR(20) | NÃO | - | UQ |
| `product_id` | INTEGER | NÃO | - | FK → `products.id` |
| `quantity` | NUMERIC(18,6) | NÃO | - | - |
| `quantity_produced` | NUMERIC(18,6) | sim | 0 | - |
| `priority` | enum_production_orders_priority | sim | 'normal'::enum_production_orders_prio... | - |
| `status` | enum_production_orders_status | sim | 'planned'::enum_production_orders_status | - |
| `start_date` | DATE | sim | - | - |
| `due_date` | DATE | NÃO | - | - |
| `completion_date` | DATE | sim | - | - |
| `sales_order_id` | INTEGER | sim | - | FK → `sales.id` |
| `responsible_id` | INTEGER | sim | - | FK → `employees.id` |
| `notes` | TEXT | sim | - | - |
| `created_by` | INTEGER | sim | - | FK → `users.id` |
| `created_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |
| `item_id` | UUID | sim | - | FK → `items.id` |
| `quantity_scrapped` | NUMERIC(18,6) | NÃO | 0 | - |
| `scrap_reason` | TEXT | sim | - | - |
| `department_id` | INTEGER | sim | - | FK → `departments.id` |

## `production_route_steps`

Etapa de uma rota de manufatura (setup, cycle time, centro de trabalho).

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | INTEGER | NÃO | auto-increment | **PK** |
| `production_route_id` | INTEGER | NÃO | - | FK → `production_routes.id` |
| `sequence` | INTEGER | NÃO | - | - |
| `step_code` | VARCHAR(50) | NÃO | - | - |
| `name` | VARCHAR(120) | NÃO | - | - |
| `work_center` | VARCHAR(100) | sim | - | - |
| `standard_time_minutes` | NUMERIC(10,2) | NÃO | 0 | - |
| `setup_time_minutes` | NUMERIC(10,2) | NÃO | 0 | - |
| `instructions` | TEXT | sim | - | - |
| `quality_check_required` | BOOLEAN | NÃO | false | - |
| `is_active` | BOOLEAN | NÃO | true | - |
| `created_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |
| `work_center_id` | INTEGER | sim | - | FK → `work_centers.id` |

## `production_routes`

Rota de manufatura de um produto (sequência de operações).

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | INTEGER | NÃO | auto-increment | **PK** |
| `product_id` | INTEGER | NÃO | - | FK → `products.id` |
| `route_code` | VARCHAR(50) | NÃO | - | UQ |
| `revision` | VARCHAR(10) | NÃO | '00'::character varying | - |
| `status` | enum_production_routes_status | NÃO | 'draft'::enum_production_routes_status | - |
| `description` | TEXT | sim | - | - |
| `total_standard_time_minutes` | NUMERIC(10,2) | NÃO | 0 | - |
| `created_by` | INTEGER | sim | - | FK → `users.id` |
| `approved_by` | INTEGER | sim | - | FK → `users.id` |
| `approved_at` | TIMESTAMP WITH TIME ZONE | sim | - | - |
| `created_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |
| `item_id` | UUID | sim | - | FK → `items.id` |

## `products`

[LEGADO — coexiste com `items`] Catálogo de produtos original (SKU, preço, estoque, Thiele-Small). Ainda referenciado por `sales`, `purchase_order_items`, `production_orders`.

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | INTEGER | NÃO | auto-increment | **PK** |
| `name` | VARCHAR(200) | NÃO | - | - |
| `code` | VARCHAR(50) | NÃO | - | UQ |
| `description` | TEXT | sim | ''::text | - |
| `category_id` | INTEGER | sim | - | FK → `product_categories.id` |
| `price` | NUMERIC(10,2) | NÃO | 0 | - |
| `cost_price` | NUMERIC(10,2) | sim | 0 | - |
| `quantity` | NUMERIC(18,6) | sim | 0 | - |
| `reserved_quantity` | NUMERIC(18,6) | sim | 0 | - |
| `min_quantity` | NUMERIC(18,6) | sim | 5 | - |
| `status` | enum_products_status | sim | 'active'::enum_products_status | - |
| `location` | VARCHAR(100) | sim | ''::character varying | - |
| `product_type` | enum_products_product_type | sim | 'finished'::enum_products_product_type | - |
| `ncm` | VARCHAR(10) | sim | '85182100'::character varying | - |
| `cest` | VARCHAR(10) | sim | - | - |
| `weight` | NUMERIC(10,3) | sim | 0 | - |
| `unit` | VARCHAR(10) | sim | 'un'::character varying | - |
| `lead_time` | INTEGER | sim | 0 | - |
| `drawing_number` | VARCHAR(50) | sim | - | - |
| `lot_number` | VARCHAR(50) | sim | - | - |
| `serial_number` | VARCHAR(80) | sim | - | - |
| `revision` | VARCHAR(10) | sim | '00'::character varying | - |
| `ts_params_fs` | NUMERIC(10,2) | sim | - | - |
| `ts_params_qms` | NUMERIC(10,2) | sim | - | - |
| `ts_params_qes` | NUMERIC(10,2) | sim | - | - |
| `ts_params_qts` | NUMERIC(10,2) | sim | - | - |
| `ts_params_vas` | NUMERIC(10,2) | sim | - | - |
| `ts_params_sd` | NUMERIC(10,2) | sim | - | - |
| `ts_params_xmax` | NUMERIC(10,2) | sim | - | - |
| `ts_params_re` | NUMERIC(10,2) | sim | - | - |
| `ts_params_le` | NUMERIC(10,2) | sim | - | - |
| `ts_params_bl` | NUMERIC(10,2) | sim | - | - |
| `ts_params_mms` | NUMERIC(10,2) | sim | - | - |
| `ts_params_cms` | NUMERIC(10,2) | sim | - | - |
| `ts_params_spl` | NUMERIC(10,2) | sim | - | - |
| `created_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |
| `photo_path` | VARCHAR(500) | sim | - | - |

## `purchase_order_items`

Itens de um Pedido de Compra, com quantidade recebida e status.

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | INTEGER | NÃO | auto-increment | **PK** |
| `purchase_id` | INTEGER | NÃO | - | FK → `purchase_orders.id` |
| `product_id` | INTEGER | NÃO | - | FK → `products.id` |
| `quantity` | NUMERIC(10,2) | NÃO | - | - |
| `unit_price` | NUMERIC(10,2) | NÃO | - | - |
| `total_price` | NUMERIC(10,2) | NÃO | - | - |
| `received_quantity` | NUMERIC(10,2) | sim | 0 | - |
| `status` | enum_purchase_order_items_status | sim | 'pending'::enum_purchase_order_items_... | - |
| `created_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |
| `item_id` | UUID | sim | - | FK → `items.id` |

## `purchase_orders`

Pedido de Compra — origem em Requisição, ciclo pending→approved→sent→partial→received.

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | INTEGER | NÃO | auto-increment | **PK** |
| `order_number` | VARCHAR(20) | NÃO | - | UQ |
| `supplier_id` | INTEGER | NÃO | - | FK → `suppliers.id` |
| `requester_id` | INTEGER | sim | - | FK → `users.id` |
| `status` | enum_purchase_orders_status | sim | 'pending'::enum_purchase_orders_status | - |
| `requisition_id` | INTEGER | sim | - | - |
| `order_date` | DATE | sim | - | - |
| `expected_date` | DATE | sim | - | - |
| `delivery_date` | DATE | sim | - | - |
| `freight_type` | enum_purchase_orders_freight_type | sim | - | - |
| `freight_value` | NUMERIC(10,2) | sim | 0 | - |
| `total_amount` | NUMERIC(10,2) | sim | 0 | - |
| `notes` | TEXT | sim | - | - |
| `invoice_number` | VARCHAR(50) | sim | - | - |
| `invoice_date` | DATE | sim | - | - |
| `created_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |
| `nfe_key` | VARCHAR(50) | sim | - | - |
| `nfe_series` | VARCHAR(10) | sim | - | - |
| `nfe_xml_path` | VARCHAR(500) | sim | - | - |
| `nfe_registered_by` | INTEGER | sim | - | - |
| `nfe_registered_at` | TIMESTAMP WITH TIME ZONE | sim | - | - |
| `invoice_type` | enum_purchase_orders_invoice_type | sim | - | - |

## `purchase_receipts`

Registros de recebimento físico de um Pedido de Compra.

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | INTEGER | NÃO | auto-increment | **PK** |
| `purchase_id` | INTEGER | NÃO | - | - |
| `invoice_number` | VARCHAR(50) | NÃO | - | - |
| `received_by` | INTEGER | sim | - | - |
| `received_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |
| `created_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |

## `purchase_requisition_items`

Itens de uma requisição de compra.

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | INTEGER | NÃO | auto-increment | **PK** |
| `requisition_id` | INTEGER | NÃO | - | FK → `purchase_requisitions.id` |
| `item_id` | UUID | NÃO | - | FK → `items.id` |
| `quantity` | NUMERIC(18,6) | NÃO | - | - |
| `unit` | VARCHAR(12) | sim | - | - |
| `required_date` | DATE | sim | - | - |
| `suggested_supplier_id` | INTEGER | sim | - | FK → `suppliers.id` |
| `unit_price_estimated` | NUMERIC(14,2) | sim | - | - |
| `status` | enum_purchase_requisition_items_status | NÃO | 'pending'::enum_purchase_requisition_... | - |
| `notes` | TEXT | sim | - | - |
| `created_at` | TIMESTAMP WITH TIME ZONE | NÃO | CURRENT_TIMESTAMP | - |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NÃO | CURRENT_TIMESTAMP | - |

## `purchase_requisitions`

Requisição de Compra — origem obrigatória de toda cadeia de suprimentos (rastreabilidade P0).

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | INTEGER | NÃO | auto-increment | **PK** |
| `requisition_number` | VARCHAR(60) | NÃO | - | UQ |
| `requester_id` | INTEGER | NÃO | - | FK → `users.id` |
| `department_id` | INTEGER | sim | - | FK → `departments.id` |
| `production_order_id` | INTEGER | sim | - | FK → `production_orders.id` |
| `request_date` | DATE | NÃO | CURRENT_DATE | - |
| `priority` | enum_purchase_requisitions_priority | NÃO | 'normal'::enum_purchase_requisitions_... | - |
| `status` | enum_purchase_requisitions_status | NÃO | 'pending'::enum_purchase_requisitions... | - |
| `origin` | VARCHAR(80) | NÃO | 'manual'::character varying | - |
| `approved_by` | INTEGER | sim | - | FK → `users.id` |
| `approval_date` | DATE | sim | - | - |
| `notes` | TEXT | sim | - | - |
| `created_at` | TIMESTAMP WITH TIME ZONE | NÃO | CURRENT_TIMESTAMP | - |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NÃO | CURRENT_TIMESTAMP | - |
| `engineering_project_id` | INTEGER | sim | - | FK → `engineering_projects.id` |

## `requisicao_compra_items` `[DEPRECATED]`

[ÓRFÃ/DEPRECATED] Equivalente em português nunca adotado — usar `purchase_requisition_items`.

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | UUID | NÃO | gen_random_uuid() | **PK** |
| `requisicao_id` | UUID | NÃO | - | FK → `requisicoes_compra.id` |
| `item_id` | UUID | NÃO | - | - |
| `quantidade` | NUMERIC(18,6) | NÃO | - | - |
| `data_necessidade` | DATE | NÃO | - | - |
| `observacoes` | TEXT | sim | - | - |

## `requisicoes_compra` `[DEPRECATED]`

[ÓRFÃ/DEPRECATED] Equivalente em português nunca adotado — usar `purchase_requisitions`.

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | UUID | NÃO | gen_random_uuid() | **PK** |
| `codigo` | VARCHAR(60) | NÃO | - | UQ |
| `solicitante_id` | INTEGER | sim | - | FK → `users.id` |
| `status` | ordem_status | NÃO | 'RASCUNHO'::ordem_status | - |
| `origem` | VARCHAR(80) | NÃO | 'ENGENHARIA'::character varying | - |
| `observacoes` | TEXT | sim | - | - |
| `aprovado_por` | INTEGER | sim | - | FK → `users.id` |
| `aprovado_em` | TIMESTAMP WITH TIME ZONE | sim | - | - |
| `criado_em` | TIMESTAMP WITH TIME ZONE | NÃO | now() | - |
| `atualizado_em` | TIMESTAMP WITH TIME ZONE | NÃO | now() | - |

## `rfq_items`

Itens de uma RFQ.

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | INTEGER | NÃO | auto-increment | **PK** |
| `rfq_id` | INTEGER | NÃO | - | FK → `rfqs.id` |
| `item_id` | UUID | NÃO | - | FK → `items.id` |
| `quantity` | NUMERIC(18,6) | NÃO | - | - |
| `unit` | VARCHAR(12) | sim | - | - |
| `awarded_supplier_id` | INTEGER | sim | - | FK → `suppliers.id` |
| `awarded_unit_price` | NUMERIC(18,6) | sim | - | - |
| `created_at` | TIMESTAMP WITH TIME ZONE | NÃO | CURRENT_TIMESTAMP | - |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NÃO | CURRENT_TIMESTAMP | - |

## `rfq_quotes`

Cotações recebidas por item/fornecedor (mapa comparativo, adjudicação).

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | INTEGER | NÃO | auto-increment | **PK** |
| `rfq_item_id` | INTEGER | NÃO | - | FK → `rfq_items.id`, UQ |
| `supplier_id` | INTEGER | NÃO | - | FK → `suppliers.id`, UQ |
| `unit_price` | NUMERIC(18,6) | NÃO | - | - |
| `lead_time_days` | INTEGER | sim | - | - |
| `moq` | NUMERIC(18,6) | sim | - | - |
| `validity_date` | DATE | sim | - | - |
| `notes` | TEXT | sim | - | - |
| `created_at` | TIMESTAMP WITH TIME ZONE | NÃO | CURRENT_TIMESTAMP | - |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NÃO | CURRENT_TIMESTAMP | - |

## `rfq_suppliers`

Fornecedores convidados a cotar em uma RFQ.

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | INTEGER | NÃO | auto-increment | **PK** |
| `rfq_id` | INTEGER | NÃO | - | FK → `rfqs.id`, UQ |
| `supplier_id` | INTEGER | NÃO | - | FK → `suppliers.id`, UQ |
| `status` | enum_rfq_suppliers_status | NÃO | 'invited'::enum_rfq_suppliers_status | - |
| `invited_at` | TIMESTAMP WITH TIME ZONE | NÃO | CURRENT_TIMESTAMP | - |
| `responded_at` | TIMESTAMP WITH TIME ZONE | sim | - | - |
| `created_at` | TIMESTAMP WITH TIME ZONE | NÃO | CURRENT_TIMESTAMP | - |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NÃO | CURRENT_TIMESTAMP | - |

## `rfqs`

Cotação/RFQ multi-fornecedor (cabeçalho) — avulsa ou originada de requisição de compra.

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | INTEGER | NÃO | auto-increment | **PK** |
| `rfq_number` | VARCHAR(60) | NÃO | - | UQ |
| `requisition_id` | INTEGER | sim | - | FK → `purchase_requisitions.id` |
| `status` | enum_rfqs_status | NÃO | 'draft'::enum_rfqs_status | - |
| `created_by` | INTEGER | NÃO | - | FK → `users.id` |
| `response_deadline` | DATE | sim | - | - |
| `notes` | TEXT | sim | - | - |
| `created_at` | TIMESTAMP WITH TIME ZONE | NÃO | CURRENT_TIMESTAMP | - |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NÃO | CURRENT_TIMESTAMP | - |

## `sale_items`

Itens de uma venda, com `invoiced_quantity` acumulada (faturamento parcial).

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | INTEGER | NÃO | auto-increment | **PK** |
| `sale_id` | INTEGER | NÃO | - | FK → `sales.id` |
| `product_id` | INTEGER | NÃO | - | FK → `products.id` |
| `quantity` | NUMERIC(18,6) | NÃO | - | - |
| `unit_price` | NUMERIC(10,2) | NÃO | - | - |
| `total_price` | NUMERIC(10,2) | NÃO | - | - |
| `created_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |
| `item_id` | UUID | sim | - | FK → `items.id` |
| `cfop` | VARCHAR(4) | sim | - | - |
| `icms_cst` | VARCHAR(3) | sim | - | - |
| `icms_aliquot` | NUMERIC(5,2) | sim | - | - |
| `icms_base` | NUMERIC(12,2) | sim | - | - |
| `icms_value` | NUMERIC(12,2) | sim | - | - |
| `ipi_cst` | VARCHAR(3) | sim | - | - |
| `ipi_aliquot` | NUMERIC(5,2) | sim | - | - |
| `ipi_value` | NUMERIC(12,2) | sim | - | - |
| `pis_cst` | VARCHAR(3) | sim | - | - |
| `pis_aliquot` | NUMERIC(5,2) | sim | - | - |
| `pis_value` | NUMERIC(12,2) | sim | - | - |
| `cofins_cst` | VARCHAR(3) | sim | - | - |
| `cofins_aliquot` | NUMERIC(5,2) | sim | - | - |
| `cofins_value` | NUMERIC(12,2) | sim | - | - |
| `invoiced_quantity` | NUMERIC(18,6) | NÃO | 0 | - |

## `sales`

Vendas — ciclo quote→confirmed→partially_invoiced→invoiced→shipped.

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | INTEGER | NÃO | auto-increment | **PK** |
| `customer_id` | INTEGER | NÃO | - | FK → `clients.id` |
| `user_id` | INTEGER | NÃO | - | FK → `users.id` |
| `total_amount` | NUMERIC(10,2) | NÃO | - | - |
| `discount` | NUMERIC(10,2) | sim | 0 | - |
| `status` | enum_sales_status | sim | 'quote'::enum_sales_status | - |
| `payment_method` | enum_sales_payment_method | sim | 'pix'::enum_sales_payment_method | - |
| `installments` | INTEGER | sim | 1 | - |
| `notes` | TEXT | sim | ''::text | - |
| `nfe_number` | VARCHAR(50) | sim | - | - |
| `nfe_status` | enum_sales_nfe_status | sim | 'pending'::enum_sales_nfe_status | - |
| `nfe_key` | VARCHAR(50) | sim | - | - |
| `created_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |
| `nfe_series` | INTEGER | sim | - | - |
| `nfe_protocol` | VARCHAR(50) | sim | - | - |
| `nfe_environment` | enum_sales_nfe_environment | sim | - | - |
| `nfe_provider_ref` | VARCHAR(100) | sim | - | - |
| `nfe_xml_url` | VARCHAR(500) | sim | - | - |
| `nfe_danfe_url` | VARCHAR(500) | sim | - | - |
| `nfe_error_message` | TEXT | sim | - | - |
| `nfe_issued_at` | TIMESTAMP WITH TIME ZONE | sim | - | - |

## `serial_numbers`

Rastreabilidade por número de série de produto acabado.

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | INTEGER | NÃO | auto-increment | **PK** |
| `product_id` | INTEGER | NÃO | - | FK → `products.id` |
| `lot_control_id` | INTEGER | sim | - | FK → `lot_controls.id` |
| `production_order_id` | INTEGER | sim | - | FK → `production_orders.id` |
| `sale_id` | INTEGER | sim | - | FK → `sales.id` |
| `serial_number` | VARCHAR(120) | NÃO | - | UQ |
| `status` | enum_serial_numbers_status | NÃO | 'available'::enum_serial_numbers_status | - |
| `manufactured_at` | DATE | sim | - | - |
| `sold_at` | DATE | sim | - | - |
| `notes` | TEXT | sim | - | - |
| `created_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |
| `item_id` | UUID | sim | - | FK → `items.id` |

## `service_orders`

Ordens de serviço (assistência técnica pós-venda).

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | INTEGER | NÃO | auto-increment | **PK** |
| `order_number` | VARCHAR(20) | NÃO | - | UQ |
| `client_id` | INTEGER | NÃO | - | FK → `clients.id` |
| `product_id` | INTEGER | sim | - | FK → `products.id` |
| `equipment_description` | TEXT | sim | - | - |
| `reported_issue` | TEXT | sim | - | - |
| `diagnosed_issue` | TEXT | sim | - | - |
| `service_performed` | TEXT | sim | - | - |
| `labor_cost` | NUMERIC(10,2) | sim | 0 | - |
| `total_amount` | NUMERIC(10,2) | sim | 0 | - |
| `status` | enum_service_orders_status | sim | 'open'::enum_service_orders_status | - |
| `priority` | enum_service_orders_priority | sim | 'normal'::enum_service_orders_priority | - |
| `entry_date` | DATE | sim | - | - |
| `completion_date` | DATE | sim | - | - |
| `delivery_date` | DATE | sim | - | - |
| `technician_id` | INTEGER | sim | - | FK → `users.id` |
| `responsible_id` | INTEGER | sim | - | FK → `users.id` |
| `warranty_days` | INTEGER | sim | 90 | - |
| `notes` | TEXT | sim | - | - |
| `created_by` | INTEGER | sim | - | FK → `users.id` |
| `created_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |

## `suppliers`

Fornecedores (cadastro, avaliação manual `rating` + calculada `quality_score`).

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | INTEGER | NÃO | auto-increment | **PK** |
| `company_name` | VARCHAR(200) | NÃO | - | - |
| `trade_name` | VARCHAR(200) | sim | ''::character varying | - |
| `cnpj` | VARCHAR(18) | NÃO | - | UQ |
| `ie` | VARCHAR(20) | sim | - | - |
| `phone` | VARCHAR(20) | sim | - | - |
| `email` | VARCHAR(100) | sim | - | - |
| `cep` | VARCHAR(10) | sim | - | - |
| `street` | VARCHAR(200) | sim | - | - |
| `number` | VARCHAR(20) | sim | - | - |
| `complement` | VARCHAR(100) | sim | - | - |
| `neighborhood` | VARCHAR(100) | sim | - | - |
| `city` | VARCHAR(100) | sim | - | - |
| `state` | VARCHAR(2) | sim | - | - |
| `contact_name` | VARCHAR(100) | sim | - | - |
| `contact_phone` | VARCHAR(20) | sim | - | - |
| `payment_terms` | VARCHAR(100) | sim | - | - |
| `delivery_time` | INTEGER | sim | 15 | - |
| `rating` | INTEGER | sim | 3 | - |
| `status` | enum_suppliers_status | sim | 'active'::enum_suppliers_status | - |
| `notes` | TEXT | sim | - | - |
| `created_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |
| `quality_score` | NUMERIC(5,2) | NÃO | 100 | - |

## `users`

Usuários do sistema (login, papel global, perfil de acesso configurável).

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | INTEGER | NÃO | auto-increment | **PK** |
| `name` | VARCHAR(200) | NÃO | - | - |
| `email` | VARCHAR(100) | NÃO | - | UQ |
| `password` | VARCHAR(255) | NÃO | - | - |
| `role` | enum_users_role | sim | 'operator'::enum_users_role | - |
| `department` | VARCHAR(100) | sim | ''::character varying | - |
| `active` | BOOLEAN | sim | true | - |
| `created_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |
| `password_version` | INTEGER | NÃO | 1 | - |
| `reset_password_token_hash` | VARCHAR(64) | sim | - | - |
| `reset_password_expires_at` | TIMESTAMP WITH TIME ZONE | sim | - | - |
| `access_profile_id` | INTEGER | sim | - | FK → `access_profiles.id` |

## `usuarios` `[DEPRECATED]`

[ÓRFÃ/DEPRECATED] Equivalente em português nunca adotado — usar `users`.

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | UUID | NÃO | gen_random_uuid() | **PK** |
| `nome` | VARCHAR(160) | NÃO | - | - |
| `email` | VARCHAR(180) | NÃO | - | UQ |
| `senha_hash` | TEXT | NÃO | - | - |
| `papel` | VARCHAR(60) | NÃO | 'operator'::character varying | - |
| `ativo` | BOOLEAN | NÃO | true | - |
| `criado_em` | TIMESTAMP WITH TIME ZONE | NÃO | now() | - |
| `atualizado_em` | TIMESTAMP WITH TIME ZONE | NÃO | now() | - |

## `warehouse_transfers`

Solicitação de transferência de saldo entre depósitos, com aprovação de gestor.

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | INTEGER | NÃO | auto-increment | **PK** |
| `product_id` | INTEGER | NÃO | - | FK → `products.id` |
| `from_warehouse_id` | INTEGER | NÃO | - | FK → `warehouses.id` |
| `to_warehouse_id` | INTEGER | NÃO | - | FK → `warehouses.id` |
| `quantity` | NUMERIC(18,6) | NÃO | - | - |
| `reason` | TEXT | NÃO | - | - |
| `user_id` | INTEGER | NÃO | - | FK → `users.id` |
| `approved_by` | INTEGER | sim | - | FK → `users.id` |
| `status` | enum_warehouse_transfers_status | NÃO | 'pending'::enum_warehouse_transfers_s... | - |
| `created_at` | TIMESTAMP WITH TIME ZONE | NÃO | CURRENT_TIMESTAMP | - |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NÃO | CURRENT_TIMESTAMP | - |

## `warehouses`

Depósitos físicos cadastráveis (ex.: INSUMOS, ACABADOS, LABORATORIO).

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | INTEGER | NÃO | auto-increment | **PK** |
| `code` | VARCHAR(30) | NÃO | - | UQ |
| `name` | VARCHAR(100) | NÃO | - | - |
| `description` | TEXT | sim | - | - |
| `active` | BOOLEAN | NÃO | true | - |
| `created_at` | TIMESTAMP WITH TIME ZONE | NÃO | CURRENT_TIMESTAMP | - |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NÃO | CURRENT_TIMESTAMP | - |

## `webhook_events`

Eventos recebidos de integrações externas (ex.: n8n) — idempotência e histórico de payloads.

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | INTEGER | NÃO | auto-increment | **PK** |
| `source` | VARCHAR(50) | NÃO | - | - |
| `event_id` | VARCHAR(200) | NÃO | - | - |
| `event_type` | VARCHAR(100) | sim | - | - |
| `payload` | JSONB | sim | - | - |
| `received_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |
| `created_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NÃO | - | - |

## `webhooks_eventos` `[DEPRECATED]`

[ÓRFÃ/DEPRECATED] Equivalente em português nunca adotado — usar `webhook_events`.

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | UUID | NÃO | gen_random_uuid() | **PK** |
| `provedor` | VARCHAR(60) | NÃO | - | - |
| `evento` | VARCHAR(120) | NÃO | - | - |
| `payload` | JSONB | NÃO | - | - |
| `status` | VARCHAR(40) | NÃO | 'RECEBIDO'::character varying | - |
| `resposta` | JSONB | sim | - | - |
| `criado_em` | TIMESTAMP WITH TIME ZONE | NÃO | now() | - |
| `processado_em` | TIMESTAMP WITH TIME ZONE | sim | - | - |

## `work_center_shifts`

Turnos de operação de um centro de trabalho, por dia da semana.

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | INTEGER | NÃO | auto-increment | **PK** |
| `work_center_id` | INTEGER | NÃO | - | FK → `work_centers.id`, UQ |
| `weekday` | SMALLINT | NÃO | - | UQ |
| `start_time` | TIME WITHOUT TIME ZONE | NÃO | - | UQ |
| `end_time` | TIME WITHOUT TIME ZONE | NÃO | - | - |
| `created_at` | TIMESTAMP WITH TIME ZONE | NÃO | CURRENT_TIMESTAMP | - |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NÃO | CURRENT_TIMESTAMP | - |

## `work_centers`

Centro de trabalho (capacidade finita) — máquinas, eficiência, custo por hora.

| Coluna | Tipo | Nulo? | Default | Chave |
|---|---|---|---|---|
| `id` | INTEGER | NÃO | auto-increment | **PK** |
| `code` | VARCHAR(30) | NÃO | - | UQ |
| `name` | VARCHAR(100) | NÃO | - | - |
| `description` | TEXT | sim | - | - |
| `machines_count` | INTEGER | NÃO | 1 | - |
| `capacity_hours_per_day` | NUMERIC(6,2) | NÃO | 8 | - |
| `efficiency_factor` | NUMERIC(5,4) | NÃO | 1 | - |
| `active` | BOOLEAN | NÃO | true | - |
| `created_at` | TIMESTAMP WITH TIME ZONE | NÃO | CURRENT_TIMESTAMP | - |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NÃO | CURRENT_TIMESTAMP | - |
| `cost_per_hour` | NUMERIC(18,6) | NÃO | 0 | - |

