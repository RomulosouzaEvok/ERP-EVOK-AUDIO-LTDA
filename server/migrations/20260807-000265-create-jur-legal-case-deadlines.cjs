'use strict';

/**
 * BLOCO 3 JUR — UC-54 (fluxo mais critico do modulo), RF-JUR-021 a 025,
 * RNF-JUR-04, BR-JUR-010 a 014.
 *
 * Cria `jur_legal_case_deadlines` (PrazoProcessual). Regras impostas na
 * migration (nao so na aplicacao), pela decisao explicita repassada
 * (item 4: "responsible_user_id NOT NULL sem excecao"):
 *
 * 1. `responsible_user_id` e NOT NULL de verdade — nao existe caminho de
 *    INSERT sem ele, nem para rascunho (RF-JUR-021, "sem excecao,
 *    inclusive para rascunho").
 * 2. `ck_jur_legal_case_deadlines_fatal_requires_escalation`: se
 *    `is_fatal = true`, `escalation_user_id` e obrigatorio — a escalada
 *    automatica em D-3 (RF-JUR-022) precisa de destinatario definido
 *    desde o cadastro, nao pode ser resolvida so em runtime.
 * 3. `ck_jur_legal_case_deadlines_fulfilled_confirmed_distinct`: rejeita
 *    `fulfilled_by = confirmed_by` — dupla confirmacao com usuarios
 *    distintos (RF-JUR-024, BR-JUR-013), reforcando em banco o que a
 *    aplicacao ja deve validar antes do INSERT/UPDATE.
 * 4. `ck_jur_legal_case_deadlines_confirmed_requires_evidence`: status
 *    `confirmed`/`confirmed_late` exige `fulfilled_by`, `confirmed_by` E
 *    `evidence_file_path` simultaneamente preenchidos.
 * 5. `ck_jur_legal_case_deadlines_confirmed_late_requires_justification`:
 *    baixa retroativa (`confirmed_late`, apos `missed`) exige
 *    `retroactive_justification` preenchida — nunca silenciosa
 *    (RF-JUR-025, BR-JUR-014).
 *
 * IMUTABILIDADE APOS CONFIRMACAO (item 3 da decisao repassada, mesmo
 * racional das triggers `sst_lock_*`): uma vez `status IN ('confirmed',
 * 'confirmed_late')`, a linha e travada contra qualquer UPDATE/DELETE
 * adicional pela trigger `trg_jur_lock_legal_case_deadline` — e o registro
 * de "baixa de prazo fatal" citado explicitamente na decisao repassada
 * como candidato a imutabilidade estrutural. DELETE e SEMPRE bloqueado
 * (RF-JUR-044 — nenhum prazo e excluido fisicamente), independente do
 * status.
 *
 * RNF-JUR-04 (alertas de prazo fatal nao podem ser desativados por
 * ninguem, nem admin): esta tabela e a tabela `jur_legal_alerts` (migration
 * 000167) deliberadamente NAO tem nenhuma coluna do tipo
 * "alerts_disabled"/"muted"/"active" — a ausencia estrutural do campo e a
 * garantia (nao ha nada para a aplicacao ou um UPDATE manual via psql
 * desativar), mesma tecnica de enforcement-por-ausencia-de-coluna usada
 * em `intellectual_property.trade_secret` (RF-JUR-033, migration 000170).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('jur_legal_case_deadlines', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      legal_case_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'jur_legal_cases', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      description: { type: Sequelize.STRING(200), allowNull: false },
      due_date: { type: Sequelize.DATEONLY, allowNull: false, comment: 'Data fatal informada manualmente pelo advogado — o sistema NAO calcula (RF-JUR-023)' },
      is_fatal: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      responsible_user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        comment: 'Obrigatorio sem excecao, inclusive para rascunho (RF-JUR-021)',
      },
      backup_user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        comment: 'Substituto opcional que pode registrar o cumprimento em ausencia do titular (UC-54 A2)',
      },
      escalation_user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        comment: 'Destinatario da escalada automatica em D-3 sem acknowledge — obrigatorio quando is_fatal=true (CHECK)',
      },
      status: {
        type: Sequelize.ENUM('pending', 'fulfilled_pending_confirmation', 'confirmed', 'missed', 'confirmed_late'),
        allowNull: false,
        defaultValue: 'pending',
      },
      acknowledged_at: { type: Sequelize.DATE, allowNull: true, comment: 'Confirmacao de ciencia do responsavel (evita escalada automatica em D-3)' },
      evidence_file_path: { type: Sequelize.STRING(255), allowNull: true, comment: '1a confirmacao: evidencia de cumprimento (protocolo)' },
      fulfilled_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      fulfilled_at: { type: Sequelize.DATE, allowNull: true },
      confirmed_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        comment: '2a confirmacao — usuario obrigatoriamente distinto de fulfilled_by (CHECK)',
      },
      confirmed_at: { type: Sequelize.DATE, allowNull: true },
      escalated_at: { type: Sequelize.DATE, allowNull: true },
      missed_at: { type: Sequelize.DATE, allowNull: true, comment: 'Preenchido quando due_date vence sem baixa (transicao automatica para missed)' },
      retroactive_justification: { type: Sequelize.TEXT, allowNull: true, comment: 'Obrigatoria para baixa apos missed (status=confirmed_late) — RF-JUR-025' },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.sequelize.query(`
      ALTER TABLE jur_legal_case_deadlines ADD CONSTRAINT ck_jur_legal_case_deadlines_fatal_requires_escalation
      CHECK (is_fatal = false OR escalation_user_id IS NOT NULL);
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE jur_legal_case_deadlines ADD CONSTRAINT ck_jur_legal_case_deadlines_fulfilled_confirmed_distinct
      CHECK (fulfilled_by IS NULL OR confirmed_by IS NULL OR fulfilled_by <> confirmed_by);
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE jur_legal_case_deadlines ADD CONSTRAINT ck_jur_legal_case_deadlines_confirmed_requires_evidence
      CHECK (status NOT IN ('confirmed', 'confirmed_late')
        OR (fulfilled_by IS NOT NULL AND confirmed_by IS NOT NULL AND evidence_file_path IS NOT NULL));
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE jur_legal_case_deadlines ADD CONSTRAINT ck_jur_legal_case_deadlines_confirmed_late_requires_justification
      CHECK (status <> 'confirmed_late' OR retroactive_justification IS NOT NULL);
    `);

    await queryInterface.addIndex('jur_legal_case_deadlines', ['legal_case_id'], { name: 'idx_jur_legal_case_deadlines_legal_case_id' });
    await queryInterface.addIndex('jur_legal_case_deadlines', ['responsible_user_id'], { name: 'idx_jur_legal_case_deadlines_responsible_user_id' });
    await queryInterface.addIndex('jur_legal_case_deadlines', ['status'], { name: 'idx_jur_legal_case_deadlines_status' });
    await queryInterface.addIndex('jur_legal_case_deadlines', ['due_date'], { name: 'idx_jur_legal_case_deadlines_due_date' });
    await queryInterface.addIndex('jur_legal_case_deadlines', ['is_fatal'], { name: 'idx_jur_legal_case_deadlines_is_fatal' });

    // Imutabilidade pos-confirmacao (ver cabecalho). DELETE sempre bloqueado
    // (RF-JUR-044); UPDATE bloqueado apenas quando OLD.status ja e um estado
    // final de baixa (confirmed/confirmed_late).
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION jur_lock_legal_case_deadline() RETURNS trigger AS $$
      BEGIN
        IF TG_OP = 'DELETE' THEN
          RAISE EXCEPTION 'jur_legal_case_deadlines id=% nao pode ser excluido (RF-JUR-044). Use status para refletir o desfecho.', OLD.id;
        END IF;

        IF OLD.status IN ('confirmed', 'confirmed_late') THEN
          RAISE EXCEPTION 'jur_legal_case_deadlines id=% ja foi baixado (status=%) e e imutavel (RNF-JUR-02/BR-JUR-013/014).', OLD.id, OLD.status;
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await queryInterface.sequelize.query(`
      CREATE TRIGGER trg_jur_lock_legal_case_deadline
      BEFORE UPDATE OR DELETE ON jur_legal_case_deadlines
      FOR EACH ROW EXECUTE FUNCTION jur_lock_legal_case_deadline();
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TRIGGER IF EXISTS trg_jur_lock_legal_case_deadline ON jur_legal_case_deadlines;');
    await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS jur_lock_legal_case_deadline();');
    await queryInterface.dropTable('jur_legal_case_deadlines');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_jur_legal_case_deadlines_status";');
  },
};
