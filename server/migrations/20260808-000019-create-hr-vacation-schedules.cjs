'use strict';

/**
 * BLOCO 6 RH — RF-RH-035 a 040 (Ferias — programacao/fracionamento/abono,
 * P0) — UC-67.
 *
 * `superseded_by_id` (auto-FK, RF-RH-040): alteracao de programacao ja
 * aprovada gera um NOVO registro com motivo, preservando o historico da
 * versao anterior — a versao antiga aponta para a nova via
 * `superseded_by_id`, nunca e sobrescrita (nem excluida — ver trigger de
 * bloqueio de DELETE abaixo).
 *
 * Regras agregadas por periodo aquisitivo (max 3 fracoes, uma >=14 dias e
 * as demais >=5, abono <=1/3 dos dias do periodo — RF-RH-035/036) NAO sao
 * expressas em CHECK de linha (dependem de agregacao entre varias linhas
 * do mesmo `accrual_period_id`) — ficam como validacao de aplicacao, mesmo
 * criterio ja usado no Bloco 5 MKT para regras agregadas (percentual
 * maximo de equipe em ferias, RF-RH-039, tambem fora de CHECK pelo mesmo
 * motivo).
 *
 * Trigger `hr_block_delete_vacation_schedule`: apenas bloqueia DELETE
 * (RF-RH-040, "nunca excluidos fisicamente") — UPDATE permanece livre para
 * o ciclo de vida normal (planejado -> confirmado -> em_gozo -> concluido/
 * cancelado) ate a versao ser substituida por `superseded_by_id`.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('hr_vacation_schedules', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      accrual_period_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'hr_vacation_accrual_periods', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      fraction_number: { type: Sequelize.SMALLINT, allowNull: false },
      start_date: { type: Sequelize.DATEONLY, allowNull: false },
      days: { type: Sequelize.INTEGER, allowNull: false },
      abono: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      abono_days: { type: Sequelize.INTEGER, allowNull: true },
      abono_requested_at: { type: Sequelize.DATE, allowNull: true },
      notice_sent_at: { type: Sequelize.DATEONLY, allowNull: true },
      employee_agreement_confirmed: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      fractioning_justification: { type: Sequelize.TEXT, allowNull: true },
      status: {
        type: Sequelize.ENUM('planejado', 'confirmado', 'em_gozo', 'concluido', 'cancelado'),
        allowNull: false,
        defaultValue: 'planejado',
      },
      revision_reason: { type: Sequelize.TEXT, allowNull: true },
      superseded_by_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'hr_vacation_schedules', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      financial_confirmed_at: { type: Sequelize.DATE, allowNull: true },
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

    await queryInterface.addIndex('hr_vacation_schedules', ['accrual_period_id'], { name: 'idx_hr_vacation_schedules_accrual_period_id' });
    await queryInterface.addIndex('hr_vacation_schedules', ['start_date'], { name: 'idx_hr_vacation_schedules_start_date' });

    await queryInterface.sequelize.query(`
      ALTER TABLE hr_vacation_schedules ADD CONSTRAINT ck_hr_vacation_schedules_fraction_number
      CHECK (fraction_number BETWEEN 1 AND 3);
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE hr_vacation_schedules ADD CONSTRAINT ck_hr_vacation_schedules_days_positive
      CHECK (days > 0);
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE hr_vacation_schedules ADD CONSTRAINT ck_hr_vacation_schedules_abono_days
      CHECK (abono_days IS NULL OR abono_days > 0);
    `);

    await queryInterface.sequelize.query(`
      CREATE FUNCTION hr_block_delete_vacation_schedule() RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'hr_vacation_schedules nunca e excluido fisicamente (RF-RH-040) - use novo registro com superseded_by_id (id=%)', OLD.id;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryInterface.sequelize.query(`
      CREATE TRIGGER trg_hr_block_delete_vacation_schedule
      BEFORE DELETE ON hr_vacation_schedules
      FOR EACH ROW EXECUTE FUNCTION hr_block_delete_vacation_schedule();
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TRIGGER IF EXISTS trg_hr_block_delete_vacation_schedule ON hr_vacation_schedules;');
    await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS hr_block_delete_vacation_schedule();');
    await queryInterface.dropTable('hr_vacation_schedules');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_hr_vacation_schedules_status";');
  },
};
