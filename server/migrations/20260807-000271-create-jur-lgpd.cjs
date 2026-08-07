'use strict';

/**
 * BLOCO 3 JUR — UC-56, RF-JUR-035 a 041, BR-JUR-040 a 043, LGPD arts.
 * 7/18/19/37/41/48.
 *
 * Cria o cluster LGPD:
 * - `jur_lgpd_processing_activities` (RoPA — LgpdAtividadeTratamento):
 *   inventario de atividades de tratamento, revisao anual.
 * - `jur_lgpd_data_subject_requests` (LgpdSolicitacaoTitular): atendimento a
 *   titular, `due_date` = `received_at` + 15 dias (RF-JUR-037, art. 19 II)
 *   — CALCULADA PELA APLICACAO no INSERT (nao ha DEFAULT de banco para
 *   "received_at + interval", porque `received_at` pode nao ser
 *   `CURRENT_TIMESTAMP`, e sim a data de recebimento informada
 *   retroativamente pelo canal de entrada).
 * - `jur_lgpd_incidents` (LgpdIncidente): decisao de comunicacao a
 *   ANPD/titulares obrigatoria para fechar (CHECK), com justificativa em
 *   ambos os sentidos.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('jur_lgpd_processing_activities', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      purpose: { type: Sequelize.TEXT, allowNull: false },
      legal_basis: {
        type: Sequelize.ENUM(
          'consent',
          'legal_obligation',
          'public_administration',
          'research',
          'contract_execution',
          'judicial_process',
          'life_protection',
          'health_protection',
          'legitimate_interest',
          'credit_protection'
        ),
        allowNull: false,
        comment: 'Rol taxativo do art. 7 da LGPD',
      },
      data_categories: { type: Sequelize.TEXT, allowNull: false },
      data_subject_categories: { type: Sequelize.TEXT, allowNull: false },
      source_system: { type: Sequelize.STRING(150), allowNull: true, comment: 'Tabela/sistema de origem no ERP' },
      sharing_description: { type: Sequelize.TEXT, allowNull: true },
      retention_period: { type: Sequelize.STRING(150), allowNull: true },
      security_measures: { type: Sequelize.TEXT, allowNull: true },
      department_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'departments', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        comment: 'Area dona da atividade de tratamento',
      },
      last_reviewed_at: { type: Sequelize.DATEONLY, allowNull: true },
      next_review_due_at: { type: Sequelize.DATEONLY, allowNull: true, comment: 'Revisao anual obrigatoria (RF-JUR-036)' },
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
    await queryInterface.addIndex('jur_lgpd_processing_activities', ['department_id'], { name: 'idx_jur_lgpd_processing_activities_department_id' });
    await queryInterface.addIndex('jur_lgpd_processing_activities', ['next_review_due_at'], { name: 'idx_jur_lgpd_processing_activities_next_review_due_at' });

    await queryInterface.createTable('jur_lgpd_data_subject_requests', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      request_type: {
        type: Sequelize.ENUM(
          'confirmation',
          'access',
          'correction',
          'anonymization',
          'deletion',
          'portability',
          'consent_revocation',
          'info_sharing'
        ),
        allowNull: false,
        comment: 'LGPD art. 18',
      },
      requester_name: { type: Sequelize.STRING(200), allowNull: false },
      requester_document: { type: Sequelize.STRING(20), allowNull: true },
      requester_email: { type: Sequelize.STRING(150), allowNull: true },
      data_subject_category: { type: Sequelize.STRING(100), allowNull: true, comment: 'Ex.: funcionario, cliente PF, contato de fornecedor' },
      received_at: { type: Sequelize.DATE, allowNull: false },
      due_date: { type: Sequelize.DATEONLY, allowNull: false, comment: 'Calculada em app: received_at + 15 dias (art. 19, II)' },
      status: {
        type: Sequelize.ENUM('received', 'verifying', 'in_progress', 'answered', 'rejected_justified'),
        allowNull: false,
        defaultValue: 'received',
      },
      identity_verified: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      identity_verified_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      identity_verified_at: { type: Sequelize.DATE, allowNull: true },
      rejection_justification: { type: Sequelize.TEXT, allowNull: true },
      resolution_notes: { type: Sequelize.TEXT, allowNull: true },
      answered_at: { type: Sequelize.DATE, allowNull: true },
      dpo_user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        comment: 'Encarregado (DPO) responsavel — RF-JUR-041',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.sequelize.query(`
      ALTER TABLE jur_lgpd_data_subject_requests ADD CONSTRAINT ck_jur_lgpd_dsr_in_progress_requires_verification
      CHECK (status NOT IN ('in_progress', 'answered') OR identity_verified = true);
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE jur_lgpd_data_subject_requests ADD CONSTRAINT ck_jur_lgpd_dsr_rejected_requires_justification
      CHECK (status <> 'rejected_justified' OR rejection_justification IS NOT NULL);
    `);
    await queryInterface.addIndex('jur_lgpd_data_subject_requests', ['status'], { name: 'idx_jur_lgpd_dsr_status' });
    await queryInterface.addIndex('jur_lgpd_data_subject_requests', ['due_date'], { name: 'idx_jur_lgpd_dsr_due_date' });
    await queryInterface.addIndex('jur_lgpd_data_subject_requests', ['dpo_user_id'], { name: 'idx_jur_lgpd_dsr_dpo_user_id' });

    await queryInterface.createTable('jur_lgpd_incidents', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      occurred_at: { type: Sequelize.DATE, allowNull: true, comment: 'Data estimada da ocorrencia, quando conhecida' },
      detected_at: { type: Sequelize.DATE, allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: false },
      affected_categories: { type: Sequelize.TEXT, allowNull: true },
      affected_data_subjects_estimate: { type: Sequelize.INTEGER, allowNull: true },
      risk_assessment: { type: Sequelize.TEXT, allowNull: false },
      communication_decision: {
        type: Sequelize.ENUM('communicate_anpd', 'communicate_subjects', 'communicate_both', 'not_communicate'),
        allowNull: true,
        comment: 'Preenchida durante a investigacao — obrigatoria para fechar o incidente (CHECK)',
      },
      communication_justification: { type: Sequelize.TEXT, allowNull: true, comment: 'Obrigatoria em ambos os sentidos (comunicar ou nao) — CHECK exige quando status=closed' },
      action_plan: { type: Sequelize.TEXT, allowNull: true },
      status: { type: Sequelize.ENUM('open', 'investigating', 'closed'), allowNull: false, defaultValue: 'open' },
      dpo_user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      closed_at: { type: Sequelize.DATE, allowNull: true },
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
      ALTER TABLE jur_lgpd_incidents ADD CONSTRAINT ck_jur_lgpd_incidents_closed_requires_decision
      CHECK (status <> 'closed' OR (communication_decision IS NOT NULL AND communication_justification IS NOT NULL AND closed_at IS NOT NULL));
    `);
    await queryInterface.addIndex('jur_lgpd_incidents', ['status'], { name: 'idx_jur_lgpd_incidents_status' });
    await queryInterface.addIndex('jur_lgpd_incidents', ['dpo_user_id'], { name: 'idx_jur_lgpd_incidents_dpo_user_id' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('jur_lgpd_incidents');
    await queryInterface.dropTable('jur_lgpd_data_subject_requests');
    await queryInterface.dropTable('jur_lgpd_processing_activities');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_jur_lgpd_incidents_communication_decision";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_jur_lgpd_incidents_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_jur_lgpd_data_subject_requests_request_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_jur_lgpd_data_subject_requests_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_jur_lgpd_processing_activities_legal_basis";');
  },
};
