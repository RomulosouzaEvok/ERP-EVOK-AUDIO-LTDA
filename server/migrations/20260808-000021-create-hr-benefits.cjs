'use strict';

/**
 * BLOCO 6 RH — RF-RH-050 a 054 (Beneficios, P6).
 *
 * `discount_value` <= 6% do salario-base para `category='vt'` (RF-RH-052)
 * NAO e CHECK de banco — depende de `employees.salary` (tabela diferente);
 * fica como validacao de aplicacao (`CreateEmployeeBenefitUseCase`), mesmo
 * criterio ja usado no projeto para regras cross-table (ex.: percentual
 * maximo de equipe em ferias, RF-RH-039).
 *
 * `enrollment_status='cancelado'` (nunca DELETE fisico, RF-RH-054) —
 * trigger bloqueia DELETE, igual ao padrao de `hr_vacation_schedules`.
 *
 * CORRIGIDO pelo `AuditorIntegrador` em 2026-08-09: `suspended_days`
 * faltava apesar de referenciado pelo contrato de API
 * (`docs/business/BLOCO_6_RH_API.md` §9.1, RF-RH-047 — suspensao de VT/VR
 * nos dias de afastamento grava `suspended_days` no vinculo, sem cancelar
 * a adesao). Ver `docs/business/BLOCO_6_RH_AUDITORIA.md` achado #3.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('hr_benefit_types', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING(150), allowNull: false },
      category: { type: Sequelize.ENUM('vt', 'vr', 'va', 'saude', 'odonto', 'vida', 'outros'), allowNull: false },
      funding_rule: { type: Sequelize.ENUM('percentual', 'fixo'), allowNull: false },
      supplier: { type: Sequelize.STRING(150), allowNull: true },
      active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('hr_benefit_types', ['category'], { name: 'idx_hr_benefit_types_category' });

    await queryInterface.createTable('hr_employee_benefits', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      employee_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'employees', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      benefit_type_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'hr_benefit_types', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      enrollment_status: { type: Sequelize.ENUM('ativo', 'cancelado'), allowNull: false, defaultValue: 'ativo' },
      enrolled_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      canceled_at: { type: Sequelize.DATE, allowNull: true },
      discount_value: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      company_cost_value: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      dependents: { type: Sequelize.JSONB, allowNull: true },
      suspended_days: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
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

    await queryInterface.addIndex('hr_employee_benefits', ['employee_id'], { name: 'idx_hr_employee_benefits_employee_id' });
    await queryInterface.addIndex('hr_employee_benefits', ['benefit_type_id'], { name: 'idx_hr_employee_benefits_benefit_type_id' });
    await queryInterface.addIndex('hr_employee_benefits', ['enrollment_status'], { name: 'idx_hr_employee_benefits_enrollment_status' });

    await queryInterface.sequelize.query(
      `COMMENT ON COLUMN hr_employee_benefits.discount_value IS 'Dado sensivel (financeiro individual) - segue segregacao de campo do modulo rh (RF-RH-006/BR-RH-020)';`
    );

    await queryInterface.sequelize.query(`
      CREATE FUNCTION hr_block_delete_employee_benefit() RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'hr_employee_benefits nunca e excluido fisicamente (RF-RH-054) - use enrollment_status=cancelado (id=%)', OLD.id;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryInterface.sequelize.query(`
      CREATE TRIGGER trg_hr_block_delete_employee_benefit
      BEFORE DELETE ON hr_employee_benefits
      FOR EACH ROW EXECUTE FUNCTION hr_block_delete_employee_benefit();
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TRIGGER IF EXISTS trg_hr_block_delete_employee_benefit ON hr_employee_benefits;');
    await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS hr_block_delete_employee_benefit();');
    await queryInterface.dropTable('hr_employee_benefits');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_hr_employee_benefits_enrollment_status";');
    await queryInterface.dropTable('hr_benefit_types');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_hr_benefit_types_category";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_hr_benefit_types_funding_rule";');
  },
};
