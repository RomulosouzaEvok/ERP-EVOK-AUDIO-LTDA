/**
 * Guarda: as FKs críticas de 2026-08-02 (bloqueador P0 2.1) continuam no banco.
 *
 * Movido de `server/__tests__/database/05_add_critical_foreign_keys.test.ts`
 * em 2026-08-11 (L-3, VARREDURA_DUPLA_2026-08-11.md): o `jest.config.cjs` tem
 * `roots: ['<rootDir>/tests']`, então o arquivo original **nunca rodava** —
 * cobertura aparente, execução zero, a mesma classe das 34 suítes que
 * pulavam em silêncio. Aqui ele roda contra Postgres real na suíte de
 * integração.
 */
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../../src/models';

const describeIntegration = process.env.RUN_INTEGRATION ? describe : describe.skip;

type ForeignKeyRow = {
  constraint_name: string;
  delete_rule: string;
  update_rule: string;
};

async function getForeignKeys(tableName: string): Promise<ForeignKeyRow[]> {
  return sequelize.query(
    `
      SELECT tc.constraint_name, rc.delete_rule, rc.update_rule
      FROM information_schema.table_constraints tc
      JOIN information_schema.referential_constraints rc
        ON rc.constraint_name = tc.constraint_name
      WHERE tc.table_name = $1
        AND tc.constraint_type = 'FOREIGN KEY'
    `,
    {
      bind: [tableName],
      type: QueryTypes.SELECT,
    }
  ) as Promise<ForeignKeyRow[]>;
}

async function getIndexes(tableName: string): Promise<{ indexname: string }[]> {
  return sequelize.query(
    `
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = $1
    `,
    {
      bind: [tableName],
      type: QueryTypes.SELECT,
    }
  ) as Promise<{ indexname: string }[]>;
}

async function expectForeignKey(tableName: string, constraintName: string, deleteRule?: string) {
  const foreignKeys = await getForeignKeys(tableName);
  const constraint = foreignKeys.find((row) => row.constraint_name === constraintName);

  expect(constraint).toBeDefined();
  if (deleteRule) {
    expect(constraint?.delete_rule).toBe(deleteRule);
  }
}

async function expectIndex(tableName: string, pattern: string) {
  const indexes = await getIndexes(tableName);
  expect(indexes.some((row) => row.indexname.includes(pattern))).toBe(true);
}

describeIntegration('P0.3: Critical Foreign Keys', () => {
  beforeAll(async () => {
    await sequelize.authenticate();
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('Constraint presence', () => {
    it('adds core product and purchase constraints', async () => {
      await expectForeignKey('products', 'fk_products_category_id');
      await expectForeignKey('purchase_orders', 'fk_purchase_orders_supplier_id');
      await expectForeignKey('purchase_orders', 'fk_purchase_orders_requester_id');
      await expectForeignKey('purchase_order_items', 'fk_purchase_order_items_purchase_id', 'CASCADE');
      await expectForeignKey('purchase_order_items', 'fk_purchase_order_items_product_id');
      await expectForeignKey('purchase_order_items', 'fk_purchase_order_items_item_id');
    });

    it('adds sales, finance and inventory constraints', async () => {
      await expectForeignKey('sales', 'fk_sales_customer_id');
      await expectForeignKey('sales', 'fk_sales_user_id');
      await expectForeignKey('sale_items', 'fk_sale_items_sale_id', 'CASCADE');
      await expectForeignKey('accounts_receivable', 'fk_accounts_receivable_sale_id');
      await expectForeignKey('accounts_payable', 'fk_accounts_payable_purchase_id');
      await expectForeignKey('purchase_receipts', 'fk_purchase_receipts_purchase_id', 'RESTRICT');
      await expectForeignKey('purchase_receipts', 'fk_purchase_receipts_received_by', 'RESTRICT');
      await expectForeignKey('inventory_movements', 'fk_inventory_movements_user_id');
      await expectForeignKey('inventory_counts', 'fk_inventory_counts_created_by');
      await expectForeignKey('inventory_count_items', 'fk_inventory_count_items_inventory_count_id', 'CASCADE');
    });

    it('adds production, traceability and item-core constraints', async () => {
      await expectForeignKey('production_orders', 'fk_production_orders_product_id');
      await expectForeignKey('production_orders', 'fk_production_orders_sales_order_id');
      await expectForeignKey('production_routes', 'fk_production_routes_product_id');
      await expectForeignKey('production_route_steps', 'fk_production_route_steps_route_id', 'CASCADE');
      await expectForeignKey('production_order_tracking', 'fk_production_order_tracking_order_id', 'CASCADE');
      await expectForeignKey('lot_controls', 'fk_lot_controls_production_order_id');
      await expectForeignKey('serial_numbers', 'fk_serial_numbers_lot_control_id');
      await expectForeignKey('production_lot_consumptions', 'fk_production_lot_consumptions_order_id', 'CASCADE');
      await expectForeignKey('bill_of_materials', 'fk_bom_product_id');
      await expectForeignKey('bill_of_material_items', 'fk_bom_items_parent_item_id');
      await expectForeignKey('item_detalhes_comerciais', 'fk_item_detalhes_comerciais_item_id', 'CASCADE');
      await expectForeignKey('item_estruturas', 'fk_item_estruturas_item_pai_id');
      await expectForeignKey('item_estruturas', 'fk_item_estruturas_parent_id');
      await expectForeignKey('mrp_ordens_planejadas', 'fk_mrp_ordens_planejadas_item_id');
      await expectForeignKey('product_cost_ledgers', 'fk_product_cost_ledgers_product_id', 'RESTRICT');
    });
  });

  describe('Delete rules', () => {
    it('keeps child rows aligned with parent lifecycle', async () => {
      await expectForeignKey('sale_items', 'fk_sale_items_sale_id', 'CASCADE');
      await expectForeignKey('production_route_steps', 'fk_production_route_steps_route_id', 'CASCADE');
      await expectForeignKey('item_detalhes_comerciais', 'fk_item_detalhes_comerciais_item_id', 'CASCADE');
      await expectForeignKey('bill_of_material_items', 'fk_bom_items_bom_id', 'CASCADE');
      await expectForeignKey('item_estruturas', 'fk_item_estruturas_parent_id', 'SET NULL');
    });
  });

  describe('Supporting indexes', () => {
    it('has indexes for high-traffic FK columns', async () => {
      await expectIndex('purchase_order_items', 'purchase_id');
      await expectIndex('sale_items', 'sale_id');
      await expectIndex('serial_numbers', 'lot_control_id');
      await expectIndex('non_conformities', 'reported_by');
      await expectIndex('product_cost_ledgers', 'product_id');
      await expectIndex('product_cost_ledgers', 'created_by');
    });
  });
});

