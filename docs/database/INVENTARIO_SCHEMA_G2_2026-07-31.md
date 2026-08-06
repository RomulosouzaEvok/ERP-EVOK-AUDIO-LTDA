# Inventario de Schema para G2

**Data:** 2026-07-31  
**Gate:** `G2 - Banco e recuperacao`  
**Tarefa:** `DB-01` Inventariar tabelas, colunas, indices, constraints e enums usados pelo codigo

## Fontes inspecionadas

- `server/database/postgresql/01_schema.sql`
- `server/database/postgresql/02_indexes.sql`
- `server/database/postgresql/02a_extend_item_estruturas.sql`
- `server/database/postgresql/04a_inventory_movements_expand.sql`
- `server/database/postgresql/04b_purchase_order_items_expand.sql`
- `server/database/postgresql/04c_sale_items_expand.sql`
- `server/database/postgresql/04d_production_orders_expand.sql`
- `server/database/postgresql/04e_production_lot_consumptions_expand.sql`
- `server/database/postgresql/04f_lot_controls_expand.sql`
- `server/database/postgresql/04g_serial_numbers_expand.sql`
- `server/database/postgresql/04h_production_routes_expand.sql`
- `server/database/postgresql/04i_bill_of_material_items_expand.sql`
- `docs/database/DATABASE.md`
- `docs/database/DATABASE_SETUP.md`

## Achado principal

O repositório possui hoje **tres camadas de schema**:

1. SQL base historico em portugues (`01_schema.sql` + `02_indexes.sql`).
2. Expansoes incrementais SQL para tabelas/modelos em ingles (`04a` a `04i`).
3. Models Sequelize em `server/src/models/*.ts`, que ainda sao tratados em partes da documentacao como fonte de verdade.

Isso confirma o risco descrito na auditoria: **nao existe ainda um sistema unico e versionado de migrations aplicado pelo runtime**.

## Enums identificados

Em `01_schema.sql`:

- `item_tipo`
- `item_status`
- `movimento_tipo`
- `ordem_status`
- `origem_mrp`

Em `02a_extend_item_estruturas.sql`:

- `item_estrutura_status`
- `item_estrutura_component_type`

## Tabelas base identificadas

Criadas em `01_schema.sql`:

- `usuarios`
- `fornecedores`
- `items`
- `item_estruturas`
- `lotes`
- `numeros_serie`
- `requisicoes_compra`
- `requisicao_compra_items`
- `entradas_nf`
- `entradas_nf_items`
- `ordens_producao`
- `movimentos_estoque`
- `mrp_ordens_planejadas`
- `webhooks_eventos`
- `auditoria_eventos`
- `item_categorias`
- `item_detalhes_comerciais`
- `item_especificacoes_tecnicas`

Criadas em `02a_extend_item_estruturas.sql`:

- `migracao_product_item_map`
- `migracao_bom_log`

## Expansoes incrementais identificadas

Arquivos `04a` a `04i` alteram tabelas ja existentes do schema operacional atual:

- `inventory_movements`
- `purchase_order_items`
- `sale_items`
- `production_orders`
- `production_lot_consumptions`
- `lot_controls`
- `serial_numbers`
- `production_routes`
- `bill_of_material_items`

Cada arquivo adiciona ao menos:

- coluna `item_id` ou equivalente de reconciliacao com `items`
- indices compostos para busca por `item_id`, status e datas

## Indices identificados

Em `02_indexes.sql`, existem indices para:

- `items`
- `item_estruturas`
- `movimentos_estoque`
- `lotes`
- `numeros_serie`
- `requisicoes_compra`
- `requisicao_compra_items`
- `entradas_nf`
- `entradas_nf_items`
- `ordens_producao`
- `mrp_ordens_planejadas`
- `webhooks_eventos`
- `auditoria_eventos`

Nas expansoes `04a` a `04i`, existem indices adicionais direcionados a:

- lookup por `item_id`
- lookup por `item_id + status`
- lookup por `item_id + created_at`
- lookup por `item_id + entidade associada`

## Divergencias documentadas

- `docs/database/DATABASE.md` ainda menciona `sequelize.sync({ alter: true })` como estrategia de desenvolvimento.
- `docs/database/DATABASE_SETUP.md` ainda instrui ativar `DB_FORCE_SYNC=true` para certas tabelas legadas.
- O G1 implementado em `2026-07-31` passou a bloquear `DB_FORCE_SYNC` e `DB_AUTO_ALTER` em producao, entao essa documentacao esta **desalinhada** com o runtime seguro.

## Resultado do DB-01

**Status:** `[x] Concluido`  
**Evidencia:** este inventario + busca direta em `server/database/postgresql/*.sql`  
**Risco residual:** ainda nao existe baseline de migration unificada nem tabela de controle de versao

## Proximos passos do G2

- `DB-02` Definir formato de migrations versionadas
- `DB-03` Criar migration baseline para banco novo
- `DB-05` Criar tabela de controle de versao das migrations
- `DB-08` Proibir DDL automatico no boot ja foi parcialmente tratado no G1; falta substituir completamente por migrations
