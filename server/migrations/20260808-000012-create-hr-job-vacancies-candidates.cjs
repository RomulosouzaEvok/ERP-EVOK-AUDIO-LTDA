'use strict';

/**
 * BLOCO 6 RH — RF-RH-078 a 081 (Recrutamento minimo, P2).
 *
 * Criadas ANTES de `hr_admission_processes` (`20260808-000013`) porque
 * RF-RH-080 permite que um `Candidate` aprovado origine um
 * `AdmissionProcess` pre-preenchido — evita referencia futura sem FK
 * fechada (mesmo cuidado de ordenacao usado no Bloco 1 SST para
 * `sst_planos_exames.ges_id`).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('hr_job_vacancies', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      job_position_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'hr_job_positions', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      department_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'departments', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      status: {
        type: Sequelize.ENUM('aberta', 'em_triagem', 'fechada', 'cancelada'),
        allowNull: false,
        defaultValue: 'aberta',
      },
      opened_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
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

    await queryInterface.addIndex('hr_job_vacancies', ['department_id'], { name: 'idx_hr_job_vacancies_department_id' });
    await queryInterface.addIndex('hr_job_vacancies', ['status'], { name: 'idx_hr_job_vacancies_status' });

    await queryInterface.createTable('hr_candidates', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      job_vacancy_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'hr_job_vacancies', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      name: { type: Sequelize.STRING(200), allowNull: false },
      contact: { type: Sequelize.STRING(255), allowNull: true },
      resume_file_path: { type: Sequelize.STRING(255), allowNull: true },
      stage: {
        type: Sequelize.ENUM('triagem', 'entrevista', 'aprovado', 'reprovado'),
        allowNull: false,
        defaultValue: 'triagem',
      },
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('hr_candidates', ['job_vacancy_id'], { name: 'idx_hr_candidates_job_vacancy_id' });
    await queryInterface.addIndex('hr_candidates', ['stage'], { name: 'idx_hr_candidates_stage' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('hr_candidates');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_hr_candidates_stage";');
    await queryInterface.dropTable('hr_job_vacancies');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_hr_job_vacancies_status";');
  },
};
