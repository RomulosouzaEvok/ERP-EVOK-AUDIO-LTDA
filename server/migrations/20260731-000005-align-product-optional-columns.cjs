'use strict';

const productOptionalColumns = [
  'cest',
  'drawing_number',
  'ts_params_fs',
  'ts_params_qms',
  'ts_params_qes',
  'ts_params_qts',
  'ts_params_vas',
  'ts_params_sd',
  'ts_params_xmax',
  'ts_params_re',
  'ts_params_le',
  'ts_params_bl',
  'ts_params_mms',
  'ts_params_cms',
  'ts_params_spl',
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
    for (const column of productOptionalColumns) {
      if (!(await columnExists(queryInterface, 'products', column))) {
        continue;
      }

      await setNullable(queryInterface, 'products', column, true);
    }
  },

  async down(queryInterface) {
    for (const column of productOptionalColumns) {
      if (!(await columnExists(queryInterface, 'products', column))) {
        continue;
      }

      await setNullable(queryInterface, 'products', column, false);
    }
  },
};
