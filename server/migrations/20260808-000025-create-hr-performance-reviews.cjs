'use strict';

/**
 * BLOCO 6 RH — RF-RH-077 (Avaliacao de Desempenho, minimo viavel, P2).
 * Sem workflow de calibracao ou multiplas etapas nesta rodada, conforme
 * texto explicito do RF.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('hr_performance_reviews', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      employee_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'employees', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      period: { type: Sequelize.STRING(20), allowNull: false },
      reviewer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      score: { type: Sequelize.DECIMAL(4, 2), allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      status: { type: Sequelize.ENUM('rascunho', 'concluida'), allowNull: false, defaultValue: 'rascunho' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('hr_performance_reviews', ['employee_id'], { name: 'idx_hr_performance_reviews_employee_id' });
    await queryInterface.addIndex('hr_performance_reviews', ['period'], { name: 'idx_hr_performance_reviews_period' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('hr_performance_reviews');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_hr_performance_reviews_status";');
  },
};
