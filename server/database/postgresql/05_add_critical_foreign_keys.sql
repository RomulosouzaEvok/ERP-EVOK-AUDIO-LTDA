-- 05_add_critical_foreign_keys.sql
-- P0.3: critical foreign keys for the current operational schema
-- Goal: enforce referential integrity on the real table names used by the app
-- Note: this file avoids legacy table names that do not exist in the current schema.

BEGIN;

-- ============================================================================
-- MASTER DATA
-- ============================================================================

ALTER TABLE IF EXISTS products
ADD CONSTRAINT fk_products_category_id
  FOREIGN KEY (category_id) REFERENCES product_categories(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS employees
ADD CONSTRAINT fk_employees_user_id
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS employees
ADD CONSTRAINT fk_employees_department_id
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT;

ALTER TABLE IF EXISTS departments
ADD CONSTRAINT fk_departments_manager_id
  FOREIGN KEY (manager_id) REFERENCES employees(id) ON DELETE SET NULL;

-- ============================================================================
-- PURCHASES / SALES / FINANCE
-- ============================================================================

ALTER TABLE IF EXISTS purchase_orders
ADD CONSTRAINT fk_purchase_orders_supplier_id
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT;

ALTER TABLE IF EXISTS purchase_orders
ADD CONSTRAINT fk_purchase_orders_requester_id
  FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS purchase_order_items
ADD CONSTRAINT fk_purchase_order_items_purchase_id
  FOREIGN KEY (purchase_id) REFERENCES purchase_orders(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS purchase_order_items
ADD CONSTRAINT fk_purchase_order_items_product_id
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT;

ALTER TABLE IF EXISTS purchase_order_items
ADD CONSTRAINT fk_purchase_order_items_item_id
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_purchase_order_items_purchase_id_fk
  ON purchase_order_items(purchase_id);

CREATE INDEX IF NOT EXISTS idx_purchase_order_items_product_id_fk
  ON purchase_order_items(product_id);

CREATE INDEX IF NOT EXISTS idx_purchase_order_items_item_id_fk
  ON purchase_order_items(item_id);

ALTER TABLE IF EXISTS sales
ADD CONSTRAINT fk_sales_customer_id
  FOREIGN KEY (customer_id) REFERENCES clients(id) ON DELETE RESTRICT;

ALTER TABLE IF EXISTS sales
ADD CONSTRAINT fk_sales_user_id
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT;

ALTER TABLE IF EXISTS sale_items
ADD CONSTRAINT fk_sale_items_sale_id
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS sale_items
ADD CONSTRAINT fk_sale_items_product_id
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT;

ALTER TABLE IF EXISTS sale_items
ADD CONSTRAINT fk_sale_items_item_id
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id_fk
  ON sale_items(sale_id);

CREATE INDEX IF NOT EXISTS idx_sale_items_product_id_fk
  ON sale_items(product_id);

CREATE INDEX IF NOT EXISTS idx_sale_items_item_id_fk
  ON sale_items(item_id);

ALTER TABLE IF EXISTS accounts_receivable
ADD CONSTRAINT fk_accounts_receivable_sale_id
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS accounts_receivable
ADD CONSTRAINT fk_accounts_receivable_customer_id
  FOREIGN KEY (customer_id) REFERENCES clients(id) ON DELETE RESTRICT;

ALTER TABLE IF EXISTS accounts_payable
ADD CONSTRAINT fk_accounts_payable_supplier_id
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS accounts_payable
ADD CONSTRAINT fk_accounts_payable_purchase_id
  FOREIGN KEY (purchase_id) REFERENCES purchase_orders(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS accounts_payable
ADD CONSTRAINT fk_accounts_payable_approved_by
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS product_cost_ledgers
ADD CONSTRAINT fk_product_cost_ledgers_created_by
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_product_cost_ledgers_created_by_fk
  ON product_cost_ledgers(created_by);

-- ============================================================================
-- INVENTORY
-- ============================================================================

ALTER TABLE IF EXISTS inventory_movements
ADD CONSTRAINT fk_inventory_movements_product_id
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT;

ALTER TABLE IF EXISTS inventory_movements
ADD CONSTRAINT fk_inventory_movements_item_id
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS inventory_movements
ADD CONSTRAINT fk_inventory_movements_user_id
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_inventory_movements_item_id_fk
  ON inventory_movements(item_id);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_user_id_fk
  ON inventory_movements(user_id);

ALTER TABLE IF EXISTS inventory_counts
ADD CONSTRAINT fk_inventory_counts_created_by
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT;

ALTER TABLE IF EXISTS inventory_counts
ADD CONSTRAINT fk_inventory_counts_approved_by
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_counts_created_by_fk
  ON inventory_counts(created_by);

CREATE INDEX IF NOT EXISTS idx_inventory_counts_approved_by_fk
  ON inventory_counts(approved_by);

ALTER TABLE IF EXISTS inventory_count_items
ADD CONSTRAINT fk_inventory_count_items_inventory_count_id
  FOREIGN KEY (inventory_count_id) REFERENCES inventory_counts(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS inventory_count_items
ADD CONSTRAINT fk_inventory_count_items_product_id
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT;

ALTER TABLE IF EXISTS inventory_count_items
ADD CONSTRAINT fk_inventory_count_items_item_id
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS inventory_count_items
ADD CONSTRAINT fk_inventory_count_items_counted_by
  FOREIGN KEY (counted_by) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================================================
-- PRODUCTION / TRACEABILITY
-- ============================================================================

ALTER TABLE IF EXISTS production_orders
ADD CONSTRAINT fk_production_orders_product_id
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT;

ALTER TABLE IF EXISTS production_orders
ADD CONSTRAINT fk_production_orders_item_id
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS production_orders
ADD CONSTRAINT fk_production_orders_sales_order_id
  FOREIGN KEY (sales_order_id) REFERENCES sales(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS production_orders
ADD CONSTRAINT fk_production_orders_responsible_id
  FOREIGN KEY (responsible_id) REFERENCES employees(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS production_orders
ADD CONSTRAINT fk_production_orders_created_by
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS production_routes
ADD CONSTRAINT fk_production_routes_product_id
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT;

ALTER TABLE IF EXISTS production_routes
ADD CONSTRAINT fk_production_routes_item_id
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS production_routes
ADD CONSTRAINT fk_production_routes_created_by
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS production_routes
ADD CONSTRAINT fk_production_routes_approved_by
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS production_route_steps
ADD CONSTRAINT fk_production_route_steps_route_id
  FOREIGN KEY (production_route_id) REFERENCES production_routes(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS production_order_tracking
ADD CONSTRAINT fk_production_order_tracking_order_id
  FOREIGN KEY (production_order_id) REFERENCES production_orders(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS production_order_tracking
ADD CONSTRAINT fk_production_order_tracking_step_id
  FOREIGN KEY (production_route_step_id) REFERENCES production_route_steps(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS production_order_tracking
ADD CONSTRAINT fk_production_order_tracking_operator_id
  FOREIGN KEY (operator_id) REFERENCES employees(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS lot_controls
ADD CONSTRAINT fk_lot_controls_product_id
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT;

ALTER TABLE IF EXISTS lot_controls
ADD CONSTRAINT fk_lot_controls_item_id
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS lot_controls
ADD CONSTRAINT fk_lot_controls_supplier_id
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS lot_controls
ADD CONSTRAINT fk_lot_controls_purchase_id
  FOREIGN KEY (purchase_id) REFERENCES purchase_orders(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS lot_controls
ADD CONSTRAINT fk_lot_controls_production_order_id
  FOREIGN KEY (production_order_id) REFERENCES production_orders(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS lot_controls
ADD CONSTRAINT fk_lot_controls_created_by
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS serial_numbers
ADD CONSTRAINT fk_serial_numbers_product_id
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT;

ALTER TABLE IF EXISTS serial_numbers
ADD CONSTRAINT fk_serial_numbers_item_id
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS serial_numbers
ADD CONSTRAINT fk_serial_numbers_lot_control_id
  FOREIGN KEY (lot_control_id) REFERENCES lot_controls(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS serial_numbers
ADD CONSTRAINT fk_serial_numbers_production_order_id
  FOREIGN KEY (production_order_id) REFERENCES production_orders(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS serial_numbers
ADD CONSTRAINT fk_serial_numbers_sale_id
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_serial_numbers_lot_control_id_fk
  ON serial_numbers(lot_control_id);

CREATE INDEX IF NOT EXISTS idx_serial_numbers_production_order_id_fk
  ON serial_numbers(production_order_id);

CREATE INDEX IF NOT EXISTS idx_serial_numbers_sale_id_fk
  ON serial_numbers(sale_id);

ALTER TABLE IF EXISTS production_lot_consumptions
ADD CONSTRAINT fk_production_lot_consumptions_order_id
  FOREIGN KEY (production_order_id) REFERENCES production_orders(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS production_lot_consumptions
ADD CONSTRAINT fk_production_lot_consumptions_lot_id
  FOREIGN KEY (lot_control_id) REFERENCES lot_controls(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS production_lot_consumptions
ADD CONSTRAINT fk_production_lot_consumptions_product_id
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT;

ALTER TABLE IF EXISTS production_lot_consumptions
ADD CONSTRAINT fk_production_lot_consumptions_item_id
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS production_lot_consumptions
ADD CONSTRAINT fk_production_lot_consumptions_user_id
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================================================
-- SERVICE / ASSET / QUALITY / MAINTENANCE
-- ============================================================================

ALTER TABLE IF EXISTS service_orders
ADD CONSTRAINT fk_service_orders_client_id
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT;

ALTER TABLE IF EXISTS service_orders
ADD CONSTRAINT fk_service_orders_product_id
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS service_orders
ADD CONSTRAINT fk_service_orders_technician_id
  FOREIGN KEY (technician_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS service_orders
ADD CONSTRAINT fk_service_orders_responsible_id
  FOREIGN KEY (responsible_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS service_orders
ADD CONSTRAINT fk_service_orders_created_by
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS assets
ADD CONSTRAINT fk_assets_product_id
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS assets
ADD CONSTRAINT fk_assets_department_id
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS assets
ADD CONSTRAINT fk_assets_responsible_id
  FOREIGN KEY (responsible_id) REFERENCES employees(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS non_conformities
ADD CONSTRAINT fk_non_conformities_product_id
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS non_conformities
ADD CONSTRAINT fk_non_conformities_purchase_item_id
  FOREIGN KEY (purchase_item_id) REFERENCES purchase_order_items(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS non_conformities
ADD CONSTRAINT fk_non_conformities_production_order_id
  FOREIGN KEY (production_order_id) REFERENCES production_orders(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS non_conformities
ADD CONSTRAINT fk_non_conformities_service_order_id
  FOREIGN KEY (service_order_id) REFERENCES service_orders(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS non_conformities
ADD CONSTRAINT fk_non_conformities_supplier_id
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS non_conformities
ADD CONSTRAINT fk_non_conformities_responsible_id
  FOREIGN KEY (responsible_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS non_conformities
ADD CONSTRAINT fk_non_conformities_reported_by
  FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE RESTRICT;

ALTER TABLE IF EXISTS non_conformities
ADD CONSTRAINT fk_non_conformities_closed_by
  FOREIGN KEY (closed_by) REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_non_conformities_reported_by_fk
  ON non_conformities(reported_by);

CREATE INDEX IF NOT EXISTS idx_non_conformities_closed_by_fk
  ON non_conformities(closed_by);

ALTER TABLE IF EXISTS maintenance_orders
ADD CONSTRAINT fk_maintenance_orders_asset_id
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE RESTRICT;

ALTER TABLE IF EXISTS maintenance_orders
ADD CONSTRAINT fk_maintenance_orders_reported_by
  FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS maintenance_orders
ADD CONSTRAINT fk_maintenance_orders_diagnosed_by
  FOREIGN KEY (diagnosed_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS maintenance_orders
ADD CONSTRAINT fk_maintenance_orders_technician_id
  FOREIGN KEY (technician_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS maintenance_orders
ADD CONSTRAINT fk_maintenance_orders_created_by
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS audit_logs
ADD CONSTRAINT fk_audit_logs_user_id
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================================================
-- BOM / ITEM CORE
-- ============================================================================

ALTER TABLE IF EXISTS bill_of_materials
ADD CONSTRAINT fk_bom_product_id
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT;

ALTER TABLE IF EXISTS bill_of_materials
ADD CONSTRAINT fk_bom_created_by
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS bill_of_materials
ADD CONSTRAINT fk_bom_approved_by
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS bill_of_material_items
ADD CONSTRAINT fk_bom_items_bom_id
  FOREIGN KEY (bom_id) REFERENCES bill_of_materials(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS bill_of_material_items
ADD CONSTRAINT fk_bom_items_component_product_id
  FOREIGN KEY (component_product_id) REFERENCES products(id) ON DELETE RESTRICT;

ALTER TABLE IF EXISTS bill_of_material_items
ADD CONSTRAINT fk_bom_items_item_id
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS bill_of_material_items
ADD CONSTRAINT fk_bom_items_parent_item_id
  FOREIGN KEY (parent_item_id) REFERENCES bill_of_material_items(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS bill_of_material_items
ADD CONSTRAINT fk_bom_items_alternative_product_id
  FOREIGN KEY (alternative_product_id) REFERENCES products(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS item_detalhes_comerciais
ADD CONSTRAINT fk_item_detalhes_comerciais_item_id
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS item_detalhes_comerciais
ADD CONSTRAINT fk_item_detalhes_comerciais_categoria_id
  FOREIGN KEY (categoria_id) REFERENCES item_categorias(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS item_especificacoes_tecnicas
ADD CONSTRAINT fk_item_especificacoes_tecnicas_item_id
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS item_estruturas
ADD CONSTRAINT fk_item_estruturas_item_pai_id
  FOREIGN KEY (item_pai_id) REFERENCES items(id) ON DELETE RESTRICT;

ALTER TABLE IF EXISTS item_estruturas
ADD CONSTRAINT fk_item_estruturas_item_componente_id
  FOREIGN KEY (item_componente_id) REFERENCES items(id) ON DELETE RESTRICT;

ALTER TABLE IF EXISTS item_estruturas
ADD CONSTRAINT fk_item_estruturas_parent_id
  FOREIGN KEY (parent_item_estrutura_id) REFERENCES item_estruturas(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS item_estruturas
ADD CONSTRAINT fk_item_estruturas_alternative_product_id
  FOREIGN KEY (alternative_product_id) REFERENCES items(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS mrp_ordens_planejadas
ADD CONSTRAINT fk_mrp_ordens_planejadas_item_id
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE RESTRICT;

COMMIT;
