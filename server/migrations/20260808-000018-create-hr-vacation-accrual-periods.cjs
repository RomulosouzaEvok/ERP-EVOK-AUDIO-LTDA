'use strict';

/**
 * BLOCO 6 RH — RF-RH-031 a 034, 041 a 043 (Ferias — periodo aquisitivo/
 * concessivo, P0, maior risco legal do bloco) — UC-67.
 *
 * `ck_hr_vacation_accrual_periods_period_end` (RF-RH-031/033): garante no
 * banco que `period_end = period_start + 12 meses` e
 * `concessive_end = period_end + 12 meses` — a aplicacao calcula na
 * abertura automatica do periodo, o CHECK e a ultima linha de defesa
 * contra gravacao divergente (CLAUDE.md §2, "a verdade no banco").
 *
 * `zeroed_from_period_id` (RF-RH-041): auto-FK — quando um afastamento
 * previdenciario >6 meses zera o periodo em curso, um NOVO periodo e
 * aberto a partir do retorno, apontando para o periodo zerado (nunca
 * sobrescreve o period_start/period_end do periodo original).
 *
 * Trigger `hr_lock_vacation_accrual_period` (RNF-RH-04): campos estruturais
 * (`employee_id`, `period_start`, `period_end`, `concessive_end`) sao
 * imutaveis apos o INSERT; `status`/`unexcused_absences`/`entitled_days`/
 * `days_taken`/`zeroed_reason`/`zeroed_from_period_id` evoluem durante o
 * ciclo de vida do periodo (em_curso -> programado -> gozado ->
 * vencido_dobra/zerado). DELETE sempre bloqueado — nenhum periodo
 * aquisitivo pode "sumir" (BR-RH-004, alerta de dobra).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('hr_vacation_accrual_periods', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      employee_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'employees', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      period_start: { type: Sequelize.DATEONLY, allowNull: false },
      period_end: { type: Sequelize.DATEONLY, allowNull: false },
      concessive_end: { type: Sequelize.DATEONLY, allowNull: false },
      unexcused_absences: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      entitled_days: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 30 },
      days_taken: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      status: {
        type: Sequelize.ENUM('em_curso', 'programado', 'gozado', 'vencido_dobra', 'zerado'),
        allowNull: false,
        defaultValue: 'em_curso',
      },
      zeroed_reason: { type: Sequelize.TEXT, allowNull: true },
      zeroed_from_period_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'hr_vacation_accrual_periods', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('hr_vacation_accrual_periods', ['employee_id'], { name: 'idx_hr_vacation_accrual_periods_employee_id' });
    await queryInterface.addIndex('hr_vacation_accrual_periods', ['status', 'concessive_end'], {
      name: 'idx_hr_vacation_accrual_periods_status_concessive_end',
    });

    await queryInterface.sequelize.query(`
      ALTER TABLE hr_vacation_accrual_periods ADD CONSTRAINT ck_hr_vacation_accrual_periods_period_end
      CHECK (period_end = (period_start + INTERVAL '1 year')::date);
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE hr_vacation_accrual_periods ADD CONSTRAINT ck_hr_vacation_accrual_periods_concessive_end
      CHECK (concessive_end = (period_end + INTERVAL '1 year')::date);
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE hr_vacation_accrual_periods ADD CONSTRAINT ck_hr_vacation_accrual_periods_entitled_days
      CHECK (entitled_days BETWEEN 0 AND 30);
    `);

    await queryInterface.sequelize.query(`
      CREATE FUNCTION hr_lock_vacation_accrual_period() RETURNS trigger AS $$
      BEGIN
        IF TG_OP = 'DELETE' THEN
          RAISE EXCEPTION 'hr_vacation_accrual_periods e imutavel na sua janela legal (RNF-RH-04, BR-RH-004) - DELETE nao permitido (id=%)', OLD.id;
        END IF;

        IF TG_OP = 'UPDATE' THEN
          IF NEW.employee_id IS DISTINCT FROM OLD.employee_id
             OR NEW.period_start IS DISTINCT FROM OLD.period_start
             OR NEW.period_end IS DISTINCT FROM OLD.period_end
             OR NEW.concessive_end IS DISTINCT FROM OLD.concessive_end THEN
            RAISE EXCEPTION 'hr_vacation_accrual_periods - period_start/period_end/concessive_end sao imutaveis apos abertura (id=%)', OLD.id;
          END IF;
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryInterface.sequelize.query(`
      CREATE TRIGGER trg_hr_lock_vacation_accrual_period
      BEFORE UPDATE OR DELETE ON hr_vacation_accrual_periods
      FOR EACH ROW EXECUTE FUNCTION hr_lock_vacation_accrual_period();
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TRIGGER IF EXISTS trg_hr_lock_vacation_accrual_period ON hr_vacation_accrual_periods;');
    await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS hr_lock_vacation_accrual_period();');
    await queryInterface.dropTable('hr_vacation_accrual_periods');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_hr_vacation_accrual_periods_status";');
  },
};
