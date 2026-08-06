'use strict';

/**
 * Achados de índice do DBA (auditoria multi-agente de 2026-08-06):
 *
 * 1. `production_orders.status` não tinha índice simples — o painel de TV de
 *    demandas por departamento (`SequelizeDashboardRepository.getDepartmentDemands`,
 *    `SELECT ... WHERE po.status IN (...)`) e o dashboard cockpit
 *    (`ProductionOrder.count({ where: { status: { [Op.in]: [...] } } })`)
 *    filtram só por status, sem `item_id`. Os índices compostos existentes
 *    (`idx_production_orders_item_id_status`, `idx_production_orders_item_id_created_at`)
 *    exigem `item_id` como primeira coluna e não ajudam essas queries — o
 *    Postgres cai para sequential scan em tabelas grandes.
 *
 * 2. Quatro tabelas do expand-contract Product -> Item (migrations
 *    `20260731-*`/`20260802-*`, dual-read em andamento) ganharam a coluna
 *    `item_id` (uuid, nullable) mas ficaram sem índice: `bill_of_material_items`,
 *    `inventory_count_items`, `lot_controls`, `production_lot_consumptions`.
 *    Toda leitura pelo caminho novo (`item_id`) faz sequential scan até o
 *    dual-read ser desligado.
 *
 * 3. `inventory_counts` tinha DOIS índices idênticos em `created_by`:
 *    `inventory_counts_created_by` (pré-existente, criado pelo model
 *    Sequelize `indexes: [...]`) e `idx_inventory_counts_created_by_fk`
 *    (adicionado por engano em uma migration de FK posterior). Confirmado
 *    via `\d inventory_counts` antes desta migration — mesma coluna, mesmo
 *    tipo btree, nenhuma diferença (parcial/expressão/ordem). Mantém o
 *    pré-existente (`inventory_counts_created_by`, usado por outras partes
 *    do código/testes) e derruba o duplicado.
 *
 * Idempotente: guards via `showIndex` (mesmo padrão de
 * `20260806-000003-add-department-id-to-production-orders-and-inventory-counts.cjs`).
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // 1. production_orders.status (índice simples, painel de TV / cockpit)
    const productionOrdersIndexes = await queryInterface.showIndex('production_orders');
    if (!productionOrdersIndexes.some((i) => i.name === 'idx_production_orders_status')) {
      await queryInterface.addIndex('production_orders', ['status'], {
        name: 'idx_production_orders_status',
      });
    }

    // 2. item_id nas 4 tabelas do expand-contract sem índice
    const targets = [
      { table: 'bill_of_material_items', name: 'idx_bill_of_material_items_item_id' },
      { table: 'inventory_count_items', name: 'idx_inventory_count_items_item_id' },
      { table: 'lot_controls', name: 'idx_lot_controls_item_id' },
      { table: 'production_lot_consumptions', name: 'idx_production_lot_consumptions_item_id' },
    ];
    for (const { table, name } of targets) {
      const indexes = await queryInterface.showIndex(table);
      if (!indexes.some((i) => i.name === name)) {
        await queryInterface.addIndex(table, ['item_id'], { name });
      }
    }

    // 3. Remove duplicado exato de inventory_counts(created_by)
    const inventoryCountsIndexes = await queryInterface.showIndex('inventory_counts');
    if (inventoryCountsIndexes.some((i) => i.name === 'idx_inventory_counts_created_by_fk')) {
      await queryInterface.removeIndex('inventory_counts', 'idx_inventory_counts_created_by_fk');
    }
  },

  async down(queryInterface) {
    // Reverte simetricamente, na ordem inversa.
    const inventoryCountsIndexes = await queryInterface.showIndex('inventory_counts');
    if (!inventoryCountsIndexes.some((i) => i.name === 'idx_inventory_counts_created_by_fk')) {
      await queryInterface.addIndex('inventory_counts', ['created_by'], {
        name: 'idx_inventory_counts_created_by_fk',
      });
    }

    const targets = [
      { table: 'bill_of_material_items', name: 'idx_bill_of_material_items_item_id' },
      { table: 'inventory_count_items', name: 'idx_inventory_count_items_item_id' },
      { table: 'lot_controls', name: 'idx_lot_controls_item_id' },
      { table: 'production_lot_consumptions', name: 'idx_production_lot_consumptions_item_id' },
    ];
    for (const { table, name } of targets) {
      const indexes = await queryInterface.showIndex(table);
      if (indexes.some((i) => i.name === name)) {
        await queryInterface.removeIndex(table, name);
      }
    }

    const productionOrdersIndexes = await queryInterface.showIndex('production_orders');
    if (productionOrdersIndexes.some((i) => i.name === 'idx_production_orders_status')) {
      await queryInterface.removeIndex('production_orders', 'idx_production_orders_status');
    }
  },
};
