'use strict';

const TABLE_NAME = 'users';
const COLUMN_NAME = 'password_version';

async function columnExists(queryInterface, tableName, columnName) {
  const description = await queryInterface.describeTable(tableName);
  return Object.prototype.hasOwnProperty.call(description, columnName);
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (await columnExists(queryInterface, TABLE_NAME, COLUMN_NAME)) {
      return;
    }

    await queryInterface.addColumn(TABLE_NAME, COLUMN_NAME, {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Versao de senha do usuario, incrementada a cada troca de senha para invalidar tokens JWT emitidos anteriormente.',
    });
  },

  async down(queryInterface) {
    if (!(await columnExists(queryInterface, TABLE_NAME, COLUMN_NAME))) {
      return;
    }

    await queryInterface.removeColumn(TABLE_NAME, COLUMN_NAME);
  },
};
