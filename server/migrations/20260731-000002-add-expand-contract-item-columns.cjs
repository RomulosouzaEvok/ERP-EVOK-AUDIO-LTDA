'use strict';

const columnsToEnsure = [
  { table: 'purchase_order_items', column: 'item_id' },
  { table: 'sale_items', column: 'item_id' },
  { table: 'inventory_movements', column: 'item_id' },
  { table: 'inventory_count_items', column: 'item_id' },
  { table: 'production_orders', column: 'item_id' },
  { table: 'production_routes', column: 'item_id' },
  { table: 'lot_controls', column: 'item_id' },
  { table: 'serial_numbers', column: 'item_id' },
  { table: 'production_lot_consumptions', column: 'item_id' },
  { table: 'bill_of_material_items', column: 'item_id' },
];

async function columnExists(queryInterface, tableName, columnName) {
  const description = await queryInterface.describeTable(tableName);
  return Object.prototype.hasOwnProperty.call(description, columnName);
}

module.exports = {
  async up(queryInterface, Sequelize) {
    for (const target of columnsToEnsure) {
      if (await columnExists(queryInterface, target.table, target.column)) {
        continue;
      }

      await queryInterface.addColumn(target.table, target.column, {
        type: Sequelize.UUID,
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    for (const target of columnsToEnsure) {
      if (!(await columnExists(queryInterface, target.table, target.column))) {
        continue;
      }

      await queryInterface.removeColumn(target.table, target.column);
    }
  },
};
