'use strict';

const supplierOptionalColumns = [
  'phone',
  'email',
  'cep',
  'street',
  'number',
  'complement',
  'neighborhood',
  'city',
  'state',
  'contact_name',
  'contact_phone',
  'payment_terms',
  'notes',
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
    for (const column of supplierOptionalColumns) {
      if (!(await columnExists(queryInterface, 'suppliers', column))) {
        continue;
      }

      await setNullable(queryInterface, 'suppliers', column, true);
    }
  },

  async down(queryInterface) {
    for (const column of supplierOptionalColumns) {
      if (!(await columnExists(queryInterface, 'suppliers', column))) {
        continue;
      }

      await setNullable(queryInterface, 'suppliers', column, false);
    }
  },
};
