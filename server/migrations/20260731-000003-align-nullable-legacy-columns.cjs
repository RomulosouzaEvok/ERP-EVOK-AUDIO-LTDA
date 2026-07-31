'use strict';

const nullableColumns = [
  { table: 'departments', column: 'manager_id' },
  { table: 'suppliers', column: 'ie' },
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
    for (const target of nullableColumns) {
      if (!(await columnExists(queryInterface, target.table, target.column))) {
        continue;
      }

      await setNullable(queryInterface, target.table, target.column, true);
    }
  },

  async down(queryInterface) {
    for (const target of nullableColumns) {
      if (!(await columnExists(queryInterface, target.table, target.column))) {
        continue;
      }

      await setNullable(queryInterface, target.table, target.column, false);
    }
  },
};
