'use strict';

const TABLE_NAME = 'purchase_receipts';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes(TABLE_NAME)) return;

    await queryInterface.createTable(TABLE_NAME, {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      purchase_id: { type: Sequelize.INTEGER, allowNull: false, comment: 'FK -> purchase_orders.id' },
      invoice_number: { type: Sequelize.STRING(50), allowNull: false, comment: 'Numero da NF-e do fornecedor referente a este recebimento' },
      received_by: { type: Sequelize.INTEGER, allowNull: true, comment: 'FK -> users.id' },
      received_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    // Constraint de banco (nao apenas checagem de aplicacao): impede que a
    // mesma NF do fornecedor seja registrada duas vezes para o mesmo
    // pedido, mesmo sob concorrencia (dois operadores lancando a mesma NF
    // ao mesmo tempo).
    await queryInterface.addIndex(TABLE_NAME, ['purchase_id', 'invoice_number'], {
      unique: true,
      name: 'purchase_receipts_purchase_invoice_unique',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable(TABLE_NAME);
  },
};
