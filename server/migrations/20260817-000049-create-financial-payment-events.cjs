'use strict';

/**
 * Cria o log append-only de baixas financeiras. Cada baixa grava um evento
 * com `operation_id` único; replay sequencial da mesma operação cai em 409.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        'financial_payment_events',
        {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
          },
          account_type: {
            type: Sequelize.ENUM('payable', 'receivable'),
            allowNull: false,
          },
          account_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
          },
          amount_cents: {
            type: Sequelize.BIGINT,
            allowNull: false,
          },
          payment_date: {
            type: Sequelize.DATEONLY,
            allowNull: false,
          },
          payment_method: {
            type: Sequelize.STRING(50),
            allowNull: true,
          },
          operation_id: {
            type: Sequelize.UUID,
            allowNull: false,
          },
          created_by: {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
          updated_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
        },
        { transaction }
      );

      await queryInterface.addIndex(
        'financial_payment_events',
        ['operation_id'],
        {
          unique: true,
          name: 'uq_financial_payment_events_operation_id',
          transaction,
        }
      );

      await queryInterface.addIndex(
        'financial_payment_events',
        ['account_type', 'account_id', 'created_at'],
        {
          name: 'idx_financial_payment_events_account_created_at',
          transaction,
        }
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable('financial_payment_events', { transaction });
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_financial_payment_events_account_type";',
        { transaction }
      );
    });
  },
};
