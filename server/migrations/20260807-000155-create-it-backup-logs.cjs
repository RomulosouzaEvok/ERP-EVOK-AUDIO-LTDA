'use strict';

/**
 * BLOCO 2 TI — RF-TI-039 a 042, BR-TI-017/018.
 *
 * `it_backup_logs`: evidência de execução de backup/teste de restore
 * (alimentada por script pós-cron e/ou registro manual — CLAUDE.md §6).
 *
 * `generated_ticket_id` referencia o `it_tickets` aberto automaticamente
 * quando `success=false` (RF-TI-040/BR-TI-017) — a criação do chamado é
 * responsabilidade do use-case/job que processa o log, não de trigger
 * (mesma decisão arquitetural do projeto para lógica de processo).
 *
 * A "ausência de registro nas últimas 26h" (RF-TI-041) e "dias desde o
 * último teste de restore" (RF-TI-042) são cálculos de leitura sobre esta
 * tabela (MAX(executed_at) filtrado por backup_type) — sem coluna ou
 * tabela adicional.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('it_backup_logs', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      executed_at: { type: Sequelize.DATE, allowNull: false },
      backup_type: {
        type: Sequelize.ENUM('daily', 'weekly', 'monthly', 'restore_test'),
        allowNull: false,
      },
      target: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Escopo do backup (ex.: database, uploads) — texto livre curto, sem tabela normalizada dedicada (baixa cardinalidade)',
      },
      destination: { type: Sequelize.STRING(255), allowNull: true },
      size_bytes: { type: Sequelize.BIGINT, allowNull: true },
      success: { type: Sequelize.BOOLEAN, allowNull: false },
      error_message: { type: Sequelize.TEXT, allowNull: true },
      generated_ticket_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'it_tickets', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        comment: 'Chamado urgent aberto automaticamente quando success=false (RF-TI-040)',
      },
      verified_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        comment: 'Preenchido em teste de restore verificado manualmente (RF-TI-042)',
      },
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('it_backup_logs', ['backup_type', 'executed_at'], { name: 'idx_it_backup_logs_type_executed_at' });
    await queryInterface.addIndex('it_backup_logs', ['success'], { name: 'idx_it_backup_logs_success' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('it_backup_logs');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_it_backup_logs_backup_type";');
  },
};
