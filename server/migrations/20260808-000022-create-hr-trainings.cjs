'use strict';

/**
 * BLOCO 6 RH — RF-RH-055 a 059 (Treinamentos com Validade, P7).
 *
 * `validity_months` (RF-RH-055): NULL = sem vencimento; valor sempre
 * informado/atualizado pela SST (RF-RH-059, integracao sst->rh) — RH so
 * administra o cadastro, sem regra de banco que force a origem (mesmo
 * padrao ja adotado no bloco: integracoes entre modulos sao de aplicacao,
 * nao de schema).
 *
 * `hr_job_position_trainings` (RF-RH-026): matriz N:N cargo x treinamento
 * obrigatorio.
 *
 * `hr_employee_trainings.valid_until` (RF-RH-057): calculado a partir de
 * `completed_at + validity_months` do curso — campo simples (nao gerado
 * via SQL) porque depende de JOIN com `hr_training_courses`, que Postgres
 * `GENERATED ALWAYS AS` nao suporta (subquery/JOIN nao e permitido em
 * coluna gerada) — calculo fica no use case, mesma decisao ja tomada para
 * campos derivados de multiplas tabelas em outros blocos (ex.: MKT
 * budget_alert_level).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('hr_training_courses', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING(200), allowNull: false },
      is_normative: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      nr_code: { type: Sequelize.STRING(20), allowNull: true },
      validity_months: { type: Sequelize.INTEGER, allowNull: true },
      workload_hours: { type: Sequelize.DECIMAL(6, 2), allowNull: true },
      active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.sequelize.query(`
      ALTER TABLE hr_training_courses ADD CONSTRAINT ck_hr_training_courses_validity_months
      CHECK (validity_months IS NULL OR validity_months > 0);
    `);

    await queryInterface.createTable('hr_job_position_trainings', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      job_position_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'hr_job_positions', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      training_course_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'hr_training_courses', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      required: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('hr_job_position_trainings', ['job_position_id', 'training_course_id'], {
      name: 'uq_hr_job_position_trainings_pair',
      unique: true,
    });

    await queryInterface.createTable('hr_employee_trainings', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      employee_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'employees', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      training_course_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'hr_training_courses', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      completed_at: { type: Sequelize.DATEONLY, allowNull: false },
      instructor_or_provider: { type: Sequelize.STRING(200), allowNull: true },
      certificate_file_path: { type: Sequelize.STRING(255), allowNull: true },
      valid_until: { type: Sequelize.DATEONLY, allowNull: true },
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

    await queryInterface.addIndex('hr_employee_trainings', ['employee_id'], { name: 'idx_hr_employee_trainings_employee_id' });
    await queryInterface.addIndex('hr_employee_trainings', ['training_course_id'], { name: 'idx_hr_employee_trainings_training_course_id' });
    await queryInterface.addIndex('hr_employee_trainings', ['valid_until'], { name: 'idx_hr_employee_trainings_valid_until' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('hr_employee_trainings');
    await queryInterface.dropTable('hr_job_position_trainings');
    await queryInterface.dropTable('hr_training_courses');
  },
};
