'use strict';

/**
 * BLOCO 3 JUR — UC-53, RF-JUR-014, BR-JUR (processo P2.2).
 *
 * Cria `jur_legal_case_events` (ProcessoAndamento): registro cronologico
 * IMUTAVEL — correcao gera novo registro, nunca edicao do existente.
 * Trigger `trg_jur_lock_legal_case_event` bloqueia 100% de UPDATE/DELETE
 * (mais estrita que as triggers `sst_lock_*`, que permitem UPDATE de
 * colunas de status pontuais — aqui nao existe nenhuma excecao porque o
 * andamento nao tem "status" proprio para evoluir; e puramente
 * insert-only, mesma familia de solucao do racional geral de
 * `06-ESTRUTURAS_PROGRAMAVEIS.md`).
 *
 * `event_type='decision'` e o gatilho de reavaliacao de risco obrigatoria
 * (RF-JUR-017) — a aplicacao, ao inserir um evento deste tipo, deve
 * atualizar `legal_cases.next_risk_reassessment_due_at` na mesma
 * transacao (sem trigger de banco: e regra de PROCESSO, nao invariante
 * estrutural).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('jur_legal_case_events', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      legal_case_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'jur_legal_cases', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      event_type: {
        type: Sequelize.ENUM('petition', 'hearing', 'decision', 'appeal', 'deposit', 'other'),
        allowNull: false,
      },
      occurred_at: { type: Sequelize.DATE, allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: false },
      document_url: { type: Sequelize.STRING(255), allowNull: true },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('jur_legal_case_events', ['legal_case_id', 'occurred_at'], { name: 'idx_jur_legal_case_events_case_occurred' });
    await queryInterface.addIndex('jur_legal_case_events', ['event_type'], { name: 'idx_jur_legal_case_events_event_type' });

    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION jur_lock_legal_case_event() RETURNS trigger AS $$
      BEGIN
        IF TG_OP = 'DELETE' THEN
          RAISE EXCEPTION 'jur_legal_case_events id=% e imutavel; DELETE nao permitido (RF-JUR-014/RNF-JUR-02). Registre um novo andamento corretivo.', OLD.id;
        END IF;
        RAISE EXCEPTION 'jur_legal_case_events id=% e imutavel; UPDATE nao permitido (RF-JUR-014/RNF-JUR-02). Registre um novo andamento corretivo.', OLD.id;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await queryInterface.sequelize.query(`
      CREATE TRIGGER trg_jur_lock_legal_case_event
      BEFORE UPDATE OR DELETE ON jur_legal_case_events
      FOR EACH ROW EXECUTE FUNCTION jur_lock_legal_case_event();
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TRIGGER IF EXISTS trg_jur_lock_legal_case_event ON jur_legal_case_events;');
    await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS jur_lock_legal_case_event();');
    await queryInterface.dropTable('jur_legal_case_events');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_jur_legal_case_events_event_type";');
  },
};
