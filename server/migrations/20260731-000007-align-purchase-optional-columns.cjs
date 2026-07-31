'use strict';

const purchaseOptionalColumns = [
  'requester_id',
  'requisition_id',
  'expected_date',
  'delivery_date',
  'freight_type',
  'notes',
  'invoice_number',
  'invoice_date',
];

async function columnExists(queryInterface, tableName, columnName) {
  const description = await queryInterface.describeTable(tableName);
  return Object.prototype.hasOwnProperty.call(description, columnName);
}

async function setNullable(queryInterface, tableName, columnName, nullable) {
  await queryInterface.sequelize.query(
    `ALTER TABLE "${tableName}" ALTER COLUMN "${columnName}" ${nullable ? 'DROP' : 'SET'} NOT NULL`
  );
}

module.exports = {
  async up(queryInterface) {
    for (const column of purchaseOptionalColumns) {
      if (!(await columnExists(queryInterface, 'purchase_orders', column))) {
        continue;
      }

      await setNullable(queryInterface, 'purchase_orders', column, true);
    }
  },

  async down(queryInterface) {
    for (const column of purchaseOptionalColumns) {
      if (!(await columnExists(queryInterface, 'purchase_orders', column))) {
        continue;
      }

      await setNullable(queryInterface, 'purchase_orders', column, false);
    }
  },
};
