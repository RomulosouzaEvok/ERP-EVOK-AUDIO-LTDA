'use strict';

const auditLogOptionalColumns = [
  'user_id',
  'user_name',
  'user_ip',
  'user_agent',
  'entity_id',
  'entity_description',
  'old_values',
  'new_values',
  'description',
  'error_message',
  'route',
  'method',
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
    for (const column of auditLogOptionalColumns) {
      if (!(await columnExists(queryInterface, 'audit_logs', column))) {
        continue;
      }

      await setNullable(queryInterface, 'audit_logs', column, true);
    }
  },

  async down(queryInterface) {
    for (const column of auditLogOptionalColumns) {
      if (!(await columnExists(queryInterface, 'audit_logs', column))) {
        continue;
      }

      await setNullable(queryInterface, 'audit_logs', column, false);
    }
  },
};
