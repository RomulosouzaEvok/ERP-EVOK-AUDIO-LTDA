'use strict';

const accountPayableOptionalColumns = [
  'payment_date',
  'category',
  'supplier_id',
  'purchase_id',
  'invoice_number',
  'barcode',
  'payment_type',
  'cost_center',
  'notes',
  'approved_by',
  'approval_date',
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
    for (const column of accountPayableOptionalColumns) {
      if (!(await columnExists(queryInterface, 'accounts_payable', column))) {
        continue;
      }

      await setNullable(queryInterface, 'accounts_payable', column, true);
    }
  },

  async down(queryInterface) {
    for (const column of accountPayableOptionalColumns) {
      if (!(await columnExists(queryInterface, 'accounts_payable', column))) {
        continue;
      }

      await setNullable(queryInterface, 'accounts_payable', column, false);
    }
  },
};
