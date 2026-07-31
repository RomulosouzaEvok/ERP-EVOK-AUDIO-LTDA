'use strict';

const TABLE_NAME = 'production_orders';
const QUANTITY_COLUMN = 'quantity_scrapped';
const REASON_COLUMN = 'scrap_reason';

async function columnExists(queryInterface, tableName, columnName) {
  const description = await queryInterface.describeTable(tableName);
  return Object.prototype.hasOwnProperty.call(description, columnName);
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await columnExists(queryInterface, TABLE_NAME, QUANTITY_COLUMN))) {
      await queryInterface.addColumn(TABLE_NAME, QUANTITY_COLUMN, {
        type: Sequelize.DECIMAL(18, 6),
        allowNull: false,
        defaultValue: 0,
        comment: 'Quantidade refugada na conclusao da OP (nao entra em estoque nem em quantity_produced).',
      });
    }

    if (!(await columnExists(queryInterface, TABLE_NAME, REASON_COLUMN))) {
      await queryInterface.addColumn(TABLE_NAME, REASON_COLUMN, {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Motivo do refugo registrado na conclusao da OP.',
      });
    }
  },

  async down(queryInterface) {
    if (await columnExists(queryInterface, TABLE_NAME, REASON_COLUMN)) {
      await queryInterface.removeColumn(TABLE_NAME, REASON_COLUMN);
    }

    if (await columnExists(queryInterface, TABLE_NAME, QUANTITY_COLUMN)) {
      await queryInterface.removeColumn(TABLE_NAME, QUANTITY_COLUMN);
    }
  },
};
