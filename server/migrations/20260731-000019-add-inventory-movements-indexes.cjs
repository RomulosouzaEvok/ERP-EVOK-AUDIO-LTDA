'use strict';

const TABLE_NAME = 'inventory_movements';

async function indexExists(queryInterface, tableName, indexName) {
  const indexes = await queryInterface.showIndex(tableName);
  return indexes.some((index) => index.name === indexName);
}

module.exports = {
  async up(queryInterface) {
    if (!(await indexExists(queryInterface, TABLE_NAME, 'inventory_movements_product_id_created_at'))) {
      await queryInterface.addIndex(TABLE_NAME, ['product_id', 'created_at'], {
        name: 'inventory_movements_product_id_created_at',
      });
    }
    if (!(await indexExists(queryInterface, TABLE_NAME, 'inventory_movements_reference_type_reference_id'))) {
      await queryInterface.addIndex(TABLE_NAME, ['reference_type', 'reference_id'], {
        name: 'inventory_movements_reference_type_reference_id',
      });
    }
  },

  async down(queryInterface) {
    if (await indexExists(queryInterface, TABLE_NAME, 'inventory_movements_product_id_created_at')) {
      await queryInterface.removeIndex(TABLE_NAME, 'inventory_movements_product_id_created_at');
    }
    if (await indexExists(queryInterface, TABLE_NAME, 'inventory_movements_reference_type_reference_id')) {
      await queryInterface.removeIndex(TABLE_NAME, 'inventory_movements_reference_type_reference_id');
    }
  },
};
