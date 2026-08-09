'use strict';

/**
 * BLOCO 6 RH — RF-RH-024 a 026 (Cargos, item 4 do brief, P2).
 *
 * `hr_job_positions` é o cadastro formal de cargo (substitui parcialmente
 * `employees.position`, hoje texto livre — RF-RH-025 mantém o texto livre
 * como fallback, ligação com `employees.job_position_id` é opcional e
 * adicionada na migration seguinte `20260808-000011`).
 *
 * Prefixo `hr_` (decisão de nomenclatura deste bloco, ver
 * `docs/business/BLOCO_6_RH_MODELO_DADOS.md` §0): módulo RH já usa nomes de
 * tabela/coluna em inglês desde a origem (`employees`, `departments`,
 * `status active/inactive/fired/vacation/license`) — diferente do SST
 * (`sst_`, PT-BR, por exigência textual das NRs) e do Jurídico/TI (`jur_`/
 * `it_`, inglês). `hr_` mantém consistência com o próprio domínio que está
 * sendo estendido.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('hr_job_positions', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      department_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'departments', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      name: { type: Sequelize.STRING(150), allowNull: false },
      cbo_code: { type: Sequelize.STRING(20), allowNull: true },
      description: { type: Sequelize.TEXT, allowNull: true },
      salary_range_min: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      salary_range_max: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      requirements: { type: Sequelize.TEXT, allowNull: true },
      active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('hr_job_positions', ['department_id'], { name: 'idx_hr_job_positions_department_id' });
    await queryInterface.addIndex('hr_job_positions', ['active'], { name: 'idx_hr_job_positions_active' });

    await queryInterface.sequelize.query(`
      ALTER TABLE hr_job_positions ADD CONSTRAINT ck_hr_job_positions_salary_range
      CHECK (salary_range_min IS NULL OR salary_range_max IS NULL OR salary_range_min <= salary_range_max);
    `);

    await queryInterface.sequelize.query(
      `COMMENT ON COLUMN hr_job_positions.salary_range_min IS 'Dado sensivel (faixa salarial) - segue segregacao de campo do modulo rh (RF-RH-006/BR-RH-020)';`
    );
    await queryInterface.sequelize.query(
      `COMMENT ON COLUMN hr_job_positions.salary_range_max IS 'Dado sensivel (faixa salarial) - segue segregacao de campo do modulo rh (RF-RH-006/BR-RH-020)';`
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('hr_job_positions');
  },
};
