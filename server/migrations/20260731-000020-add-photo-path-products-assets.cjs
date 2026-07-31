'use strict';

async function columnExists(queryInterface, tableName, columnName) {
  const description = await queryInterface.describeTable(tableName);
  return Object.prototype.hasOwnProperty.call(description, columnName);
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await columnExists(queryInterface, 'products', 'photo_path'))) {
      await queryInterface.addColumn('products', 'photo_path', {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'Caminho relativo (uploads/products/...) da foto do produto',
      });
    }
    if (!(await columnExists(queryInterface, 'assets', 'photo_path'))) {
      await queryInterface.addColumn('assets', 'photo_path', {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'Caminho relativo (uploads/assets/...) da foto do ativo',
      });
    }
  },

  async down(queryInterface) {
    if (await columnExists(queryInterface, 'products', 'photo_path')) {
      await queryInterface.removeColumn('products', 'photo_path');
    }
    if (await columnExists(queryInterface, 'assets', 'photo_path')) {
      await queryInterface.removeColumn('assets', 'photo_path');
    }
  },
};
