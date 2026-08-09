'use strict';

/**
 * BLOCO 6 RH — RF-RH-064 a 066 (Transferencia/Historico contratual, P9).
 *
 * RNF-RH-04: historico contratual e imutavel por natureza de auditoria
 * trabalhista (CLT art. 468) — toda alteracao de salario/cargo/departamento
 * cria um NOVO registro (`effective_from` da mudanca, fecha `effective_to`
 * do anterior), nunca `UPDATE` destrutivo de `employees.salary`/`position`/
 * `department_id` sem rastro (RF-RH-065).
 *
 * Trigger `hr_lock_job_history` (exceçao arquitetural deliberada e estreita,
 * mesmo racional das triggers SST/Jurídico — ver
 * `docs/database/06-ESTRUTURAS_PROGRAMAVEIS.md`): apos o INSERT, apenas
 * `effective_to`, `esocial_event_confirmed_at`, `esocial_event_confirmed_by`
 * e `updated_at` podem mudar (fechamento do registro por um sucessor e
 * confirmacao de envio eSocial); qualquer outra coluna alterada e
 * rejeitada. DELETE sempre bloqueado.
 *
 * CORRIGIDO pelo `AuditorIntegrador` em 2026-08-09: `pending_aso_risk_change`
 * faltava apesar de referenciado pelo contrato de API
 * (`docs/business/BLOCO_6_RH_API.md` §13.1, RF-RH-066 — mudanca de
 * cargo/departamento com ASO de risco pendente marca o registro sem
 * bloquear a gravacao do historico). Ver
 * `docs/business/BLOCO_6_RH_AUDITORIA.md` achado #4.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('hr_employee_job_history', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      employee_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'employees', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
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
      salary: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      effective_from: { type: Sequelize.DATEONLY, allowNull: false },
      effective_to: { type: Sequelize.DATEONLY, allowNull: true },
      reason: {
        type: Sequelize.ENUM('admissao', 'promocao', 'transferencia', 'reajuste'),
        allowNull: false,
      },
      pending_aso_risk_change: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      esocial_event_confirmed_at: { type: Sequelize.DATE, allowNull: true },
      esocial_event_confirmed_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
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

    await queryInterface.addIndex('hr_employee_job_history', ['employee_id'], { name: 'idx_hr_employee_job_history_employee_id' });
    await queryInterface.addIndex('hr_employee_job_history', ['employee_id', 'effective_to'], {
      name: 'idx_hr_employee_job_history_employee_open',
    });

    await queryInterface.sequelize.query(
      `COMMENT ON COLUMN hr_employee_job_history.salary IS 'Dado sensivel - segue segregacao de campo do modulo rh (RF-RH-006/BR-RH-020, RF-RH-043)';`
    );

    await queryInterface.sequelize.query(`
      CREATE FUNCTION hr_lock_job_history() RETURNS trigger AS $$
      BEGIN
        IF TG_OP = 'DELETE' THEN
          RAISE EXCEPTION 'hr_employee_job_history e imutavel (RNF-RH-04, CLT art. 468) - DELETE nao permitido (id=%)', OLD.id;
        END IF;

        IF TG_OP = 'UPDATE' THEN
          IF NEW.employee_id IS DISTINCT FROM OLD.employee_id
             OR NEW.job_position_id IS DISTINCT FROM OLD.job_position_id
             OR NEW.department_id IS DISTINCT FROM OLD.department_id
             OR NEW.salary IS DISTINCT FROM OLD.salary
             OR NEW.effective_from IS DISTINCT FROM OLD.effective_from
             OR NEW.reason IS DISTINCT FROM OLD.reason
             OR NEW.created_by IS DISTINCT FROM OLD.created_by
             OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
            RAISE EXCEPTION 'hr_employee_job_history e imutavel (RNF-RH-04) - apenas effective_to/pending_aso_risk_change/esocial_event_confirmed_at/esocial_event_confirmed_by podem mudar (id=%)', OLD.id;
          END IF;
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryInterface.sequelize.query(`
      CREATE TRIGGER trg_hr_lock_job_history
      BEFORE UPDATE OR DELETE ON hr_employee_job_history
      FOR EACH ROW EXECUTE FUNCTION hr_lock_job_history();
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TRIGGER IF EXISTS trg_hr_lock_job_history ON hr_employee_job_history;');
    await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS hr_lock_job_history();');
    await queryInterface.dropTable('hr_employee_job_history');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_hr_employee_job_history_reason";');
  },
};
