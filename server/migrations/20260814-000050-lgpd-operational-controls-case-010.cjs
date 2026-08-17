'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('jur_lgpd_dpo_designations', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      status: {
        type: Sequelize.ENUM('active', 'inactive'),
        allowNull: false,
        defaultValue: 'active',
      },
      effective_from: { type: Sequelize.DATEONLY, allowNull: false },
      effective_until: { type: Sequelize.DATEONLY, allowNull: true },
      designation_notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Formalizes the operational DPO/Encarregado assignment; the real person is data, not code.',
      },
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
      CREATE UNIQUE INDEX uq_jur_lgpd_dpo_one_active
      ON jur_lgpd_dpo_designations ((status))
      WHERE status = 'active';
    `);

    await queryInterface.createTable('jur_lgpd_retention_policies', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      category: { type: Sequelize.STRING(120), allowNull: false },
      retention_value: {
        type: Sequelize.STRING(150),
        allowNull: false,
        comment: 'Configurable value pending formal legal guidance; examples are fixtures only.',
      },
      retention_basis: { type: Sequelize.TEXT, allowNull: true },
      auto_delete_enabled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'CASE-010/D2: automatic deletion is intentionally disabled.',
      },
      status: {
        type: Sequelize.ENUM('active', 'inactive'),
        allowNull: false,
        defaultValue: 'active',
      },
      legal_guidance_status: {
        type: Sequelize.ENUM('pending_formal_guidance', 'approved'),
        allowNull: false,
        defaultValue: 'pending_formal_guidance',
      },
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
    await queryInterface.addIndex('jur_lgpd_retention_policies', ['category', 'status'], { name: 'idx_jur_lgpd_retention_policies_category_status' });

    await queryInterface.addColumn('jur_lgpd_processing_activities', 'retention_policy_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'jur_lgpd_retention_policies', key: 'id' },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
      comment: 'Structured retention policy required for new writes by CASE-010 use cases.',
    });
    await queryInterface.addIndex('jur_lgpd_processing_activities', ['retention_policy_id'], { name: 'idx_jur_lgpd_processing_activities_retention_policy_id' });

    await queryInterface.createTable('jur_lgpd_manual_tasks', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      task_type: {
        type: Sequelize.ENUM('deletion_review', 'anonymization_review'),
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('open', 'completed', 'cancelled'),
        allowNull: false,
        defaultValue: 'open',
      },
      data_subject_request_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'jur_lgpd_data_subject_requests', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      assigned_to_user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('jur_lgpd_manual_tasks', ['data_subject_request_id'], { name: 'idx_jur_lgpd_manual_tasks_dsr_id' });
    await queryInterface.addIndex('jur_lgpd_manual_tasks', ['assigned_to_user_id', 'status'], { name: 'idx_jur_lgpd_manual_tasks_assignee_status' });

    await queryInterface.addColumn('jur_lgpd_data_subject_requests', 'manual_review_task_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'jur_lgpd_manual_tasks', key: 'id' },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });

    await queryInterface.addColumn('jur_lgpd_incidents', 'assessment_due_at', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Internal operational target: start incident assessment within 72h from detected_at; not a fixed legal deadline.',
    });
    await queryInterface.addIndex('jur_lgpd_incidents', ['assessment_due_at'], { name: 'idx_jur_lgpd_incidents_assessment_due_at' });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('jur_lgpd_incidents', 'idx_jur_lgpd_incidents_assessment_due_at');
    await queryInterface.removeColumn('jur_lgpd_incidents', 'assessment_due_at');
    await queryInterface.removeColumn('jur_lgpd_data_subject_requests', 'manual_review_task_id');
    await queryInterface.dropTable('jur_lgpd_manual_tasks');
    await queryInterface.removeIndex('jur_lgpd_processing_activities', 'idx_jur_lgpd_processing_activities_retention_policy_id');
    await queryInterface.removeColumn('jur_lgpd_processing_activities', 'retention_policy_id');
    await queryInterface.dropTable('jur_lgpd_retention_policies');
    await queryInterface.dropTable('jur_lgpd_dpo_designations');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_jur_lgpd_manual_tasks_task_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_jur_lgpd_manual_tasks_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_jur_lgpd_retention_policies_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_jur_lgpd_retention_policies_legal_guidance_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_jur_lgpd_dpo_designations_status";');
  },
};
