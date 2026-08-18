'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('idempotency_keys', {
      key: {
        type: Sequelize.STRING(255),
        primaryKey: true,
        allowNull: false,
      },
      requestHash: {
        type: Sequelize.STRING(128),
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('in_progress', 'completed', 'failed'),
        allowNull: false,
        defaultValue: 'in_progress',
      },
      statusCode: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      responseBody: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      completedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    await queryInterface.addIndex('idempotency_keys', ['requestHash']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('idempotency_keys');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_idempotency_keys_status";');
  },
};
