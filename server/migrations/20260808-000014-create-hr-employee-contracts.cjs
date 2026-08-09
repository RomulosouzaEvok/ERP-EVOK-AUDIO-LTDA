'use strict';

/**
 * BLOCO 6 RH — RF-RH-013 a 016 (Contrato de Experiencia, P0 — maior risco
 * legal junto com ferias).
 *
 * `ck_hr_employee_contracts_experiencia_90_dias` (RF-RH-014): duracao total
 * (period_1 + period_2, se houver) nunca excede 90 dias corridos a partir
 * de `start_date`, para `type='experiencia'`.
 *
 * Trigger `hr_lock_employee_contract` (RNF-RH-04): campos estruturais
 * (`employee_id`, `type`, `start_date`, `period_1_end_date`, `created_by`,
 * `created_at`) sao imutaveis apos o INSERT; `period_2_end_date` so pode
 * ser preenchido UMA VEZ (de NULL para um valor — RF-RH-015, rejeita
 * segunda prorrogacao/alteracao); `status` e `effective_end_date` evoluem
 * livremente (ciclo de vida ativo/prorrogado/efetivado/rescindido). DELETE
 * sempre bloqueado.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('hr_employee_contracts', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      employee_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'employees', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      type: {
        type: Sequelize.ENUM('indeterminado', 'experiencia', 'aprendiz', 'estagio'),
        allowNull: false,
      },
      start_date: { type: Sequelize.DATEONLY, allowNull: false },
      period_1_end_date: { type: Sequelize.DATEONLY, allowNull: true },
      period_2_end_date: { type: Sequelize.DATEONLY, allowNull: true },
      effective_end_date: { type: Sequelize.DATEONLY, allowNull: true },
      status: {
        type: Sequelize.ENUM('ativo', 'prorrogado', 'efetivado', 'indeterminado_automatico', 'rescindido'),
        allowNull: false,
        defaultValue: 'ativo',
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

    await queryInterface.addIndex('hr_employee_contracts', ['employee_id'], { name: 'idx_hr_employee_contracts_employee_id' });
    await queryInterface.addIndex('hr_employee_contracts', ['status'], { name: 'idx_hr_employee_contracts_status' });
    await queryInterface.addIndex('hr_employee_contracts', ['type', 'period_1_end_date'], {
      name: 'idx_hr_employee_contracts_experiencia_alerta',
    });

    await queryInterface.sequelize.query(`
      ALTER TABLE hr_employee_contracts ADD CONSTRAINT ck_hr_employee_contracts_experiencia_90_dias
      CHECK (
        type <> 'experiencia'
        OR period_1_end_date IS NULL
        OR (COALESCE(period_2_end_date, period_1_end_date) - start_date) <= 90
      );
    `);

    await queryInterface.sequelize.query(`
      CREATE FUNCTION hr_lock_employee_contract() RETURNS trigger AS $$
      BEGIN
        IF TG_OP = 'DELETE' THEN
          RAISE EXCEPTION 'hr_employee_contracts e imutavel (RNF-RH-04) - DELETE nao permitido (id=%)', OLD.id;
        END IF;

        IF TG_OP = 'UPDATE' THEN
          IF NEW.employee_id IS DISTINCT FROM OLD.employee_id
             OR NEW.type IS DISTINCT FROM OLD.type
             OR NEW.start_date IS DISTINCT FROM OLD.start_date
             OR NEW.period_1_end_date IS DISTINCT FROM OLD.period_1_end_date
             OR NEW.created_by IS DISTINCT FROM OLD.created_by
             OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
            RAISE EXCEPTION 'hr_employee_contracts - campos estruturais sao imutaveis apos o cadastro (id=%)', OLD.id;
          END IF;

          IF OLD.period_2_end_date IS NOT NULL AND NEW.period_2_end_date IS DISTINCT FROM OLD.period_2_end_date THEN
            RAISE EXCEPTION 'hr_employee_contracts - period_2_end_date so admite uma prorrogacao (RF-RH-015, id=%)', OLD.id;
          END IF;
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryInterface.sequelize.query(`
      CREATE TRIGGER trg_hr_lock_employee_contract
      BEFORE UPDATE OR DELETE ON hr_employee_contracts
      FOR EACH ROW EXECUTE FUNCTION hr_lock_employee_contract();
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TRIGGER IF EXISTS trg_hr_lock_employee_contract ON hr_employee_contracts;');
    await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS hr_lock_employee_contract();');
    await queryInterface.dropTable('hr_employee_contracts');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_hr_employee_contracts_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_hr_employee_contracts_status";');
  },
};
