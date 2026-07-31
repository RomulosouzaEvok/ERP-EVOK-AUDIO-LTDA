'use strict';

const TABLE_NAME = 'users';
const TOKEN_COLUMN = 'reset_password_token_hash';
const EXPIRES_COLUMN = 'reset_password_expires_at';

async function columnExists(queryInterface, tableName, columnName) {
  const description = await queryInterface.describeTable(tableName);
  return Object.prototype.hasOwnProperty.call(description, columnName);
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await columnExists(queryInterface, TABLE_NAME, TOKEN_COLUMN))) {
      await queryInterface.addColumn(TABLE_NAME, TOKEN_COLUMN, {
        type: Sequelize.STRING(64),
        allowNull: true,
        comment: 'Hash SHA-256 do token de recuperacao de senha (nunca armazena o token em texto plano).',
      });
    }

    if (!(await columnExists(queryInterface, TABLE_NAME, EXPIRES_COLUMN))) {
      await queryInterface.addColumn(TABLE_NAME, EXPIRES_COLUMN, {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Data de expiracao do token de recuperacao de senha (SEC-12).',
      });
    }
  },

  async down(queryInterface) {
    if (await columnExists(queryInterface, TABLE_NAME, TOKEN_COLUMN)) {
      await queryInterface.removeColumn(TABLE_NAME, TOKEN_COLUMN);
    }

    if (await columnExists(queryInterface, TABLE_NAME, EXPIRES_COLUMN)) {
      await queryInterface.removeColumn(TABLE_NAME, EXPIRES_COLUMN);
    }
  },
};
