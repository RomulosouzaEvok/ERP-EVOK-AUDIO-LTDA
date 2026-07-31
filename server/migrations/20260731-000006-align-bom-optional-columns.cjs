'use strict';

const bomOptionalColumns = [
  'revision_notes',
  'created_by',
  'approved_by',
  'approval_date',
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
    for (const column of bomOptionalColumns) {
      if (!(await columnExists(queryInterface, 'bill_of_materials', column))) {
        continue;
      }

      await setNullable(queryInterface, 'bill_of_materials', column, true);
    }
  },

  async down(queryInterface) {
    for (const column of bomOptionalColumns) {
      if (!(await columnExists(queryInterface, 'bill_of_materials', column))) {
        continue;
      }

      await setNullable(queryInterface, 'bill_of_materials', column, false);
    }
  },
};
