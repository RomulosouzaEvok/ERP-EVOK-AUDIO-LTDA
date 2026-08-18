'use strict';

/**
 * CASE-013 / NP-2 e NP-3: registra o ator dos recebimentos e do ciclo de
 * operacoes da tesouraria. Campos historicos permanecem nullable quando a
 * identidade nao pode ser reconstruida; toda escrita nova e feita pelo JWT.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const receivableColumns = await queryInterface.describeTable('accounts_receivable');
    if (!receivableColumns.approved_by) {
      await queryInterface.addColumn('accounts_receivable', 'approved_by', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });
    }
    if (!receivableColumns.approval_date) {
      await queryInterface.addColumn('accounts_receivable', 'approval_date', {
        type: Sequelize.DATEONLY,
        allowNull: true,
      });
    }

    const operationColumns = await queryInterface.describeTable('treasury_financial_operations');
    for (const column of ['created_by', 'settled_by', 'canceled_by']) {
      if (!operationColumns[column]) {
        await queryInterface.addColumn('treasury_financial_operations', column, {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE',
        });
      }
    }
  },

  async down(queryInterface) {
    const operationColumns = await queryInterface.describeTable('treasury_financial_operations');
    for (const column of ['canceled_by', 'settled_by', 'created_by']) {
      if (operationColumns[column]) await queryInterface.removeColumn('treasury_financial_operations', column);
    }

    const receivableColumns = await queryInterface.describeTable('accounts_receivable');
    if (receivableColumns.approval_date) await queryInterface.removeColumn('accounts_receivable', 'approval_date');
    if (receivableColumns.approved_by) await queryInterface.removeColumn('accounts_receivable', 'approved_by');
  },
};
