'use strict';

/**
 * BLOCO 2 TI — UC-49, RF-TI-005/014.
 *
 * - `it_ticket_comments`: andamento do chamado (comentários do
 *   solicitante/analista). `is_internal=true` = nota visível apenas para
 *   quem tem o módulo `ti` (RF-TI-014) — enforcement de leitura é de
 *   aplicação, a coluna só guarda o flag.
 * - `it_ticket_priority_history`: trilha de reclassificação de prioridade
 *   (quem, quando, de/para) exigida por RF-TI-005/BR-TI-007, para evitar
 *   perder o histórico quando o analista corrige a prioridade informada
 *   pelo solicitante.
 *
 * `ticket_id` é `ON DELETE CASCADE` em ambas — diferente do restante do
 * bloco (RESTRICT é o padrão do projeto, CLAUDE.md §7): comentário e
 * histórico de prioridade são entidades de composição pura (parte-todo) do
 * chamado, sem valor probatório isolado, mesmo racional já usado em
 * `sst_exames_complementares.aso_id` (BLOCO_1_SST_MODELO_DADOS.md §3.2).
 * Como `it_tickets` nunca é fisicamente apagado no fluxo normal da API
 * (BR-TI-016/RF-TI-016, cancelamento é `status='canceled'`), o CASCADE é
 * uma garantia teórica, não um caminho esperado de uso.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('it_ticket_comments', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      ticket_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'it_tickets', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      author_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      body: { type: Sequelize.TEXT, allowNull: false },
      is_internal: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'true = nota visivel apenas para modulo ti (RF-TI-014) — enforcement de leitura na aplicacao',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('it_ticket_comments', ['ticket_id'], { name: 'idx_it_ticket_comments_ticket_id' });

    await queryInterface.createTable('it_ticket_priority_history', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      ticket_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'it_tickets', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      changed_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      previous_priority: { type: Sequelize.ENUM('low', 'medium', 'high', 'urgent'), allowNull: false },
      new_priority: { type: Sequelize.ENUM('low', 'medium', 'high', 'urgent'), allowNull: false },
      reason: { type: Sequelize.TEXT, allowNull: true },
      changed_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('it_ticket_priority_history', ['ticket_id'], { name: 'idx_it_ticket_priority_history_ticket_id' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('it_ticket_priority_history');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_it_ticket_priority_history_previous_priority";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_it_ticket_priority_history_new_priority";');
    await queryInterface.dropTable('it_ticket_comments');
  },
};
