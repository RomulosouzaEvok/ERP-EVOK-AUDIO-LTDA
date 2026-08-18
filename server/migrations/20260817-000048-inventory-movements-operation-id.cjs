'use strict';

/**
 * Adiciona `operation_id` em `inventory_movements` e trava replay com índice
 * único parcial. Históricos antigos permanecem válidos com `NULL`.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        'inventory_movements',
        'operation_id',
        {
          type: Sequelize.UUID,
          allowNull: true,
          comment: 'Chave de idempotência da operação HTTP (rota POST /api/inventory/movements)',
        },
        { transaction }
      );

      await queryInterface.sequelize.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_movements_operation_id
           ON inventory_movements (operation_id)
         WHERE operation_id IS NOT NULL;`,
        { transaction }
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        'DROP INDEX IF EXISTS uq_inventory_movements_operation_id;',
        { transaction }
      );

      await queryInterface.removeColumn('inventory_movements', 'operation_id', { transaction });
    });
  },
};
