'use strict';

/**
 * BLOCO 4 FAC (correção) — RF-FAC-049/050, §6.3 do documento de requisitos.
 *
 * `facility_cleaning_schedules` (mantida, redesenhada como **plano**):
 * - `facility_area_id` (FK nullable → `facility_areas.id`): substitui o
 *   texto livre `area` quando a área existir no cadastro formal. `area`
 *   (STRING já existente) é mantido como fallback consciente para áreas
 *   informais (decisão original preservada, §6.3) — não é reversão, é
 *   coexistência: preencher `facility_area_id` quando possível, `area`
 *   sempre preenchido (mesmo quando há FK) para não quebrar telas
 *   existentes que leem o texto livre.
 * - `responsible_employee_id` (FK nullable → `employees.id`): versão
 *   estruturada de `responsible_person` (STRING já existente, mantido como
 *   fallback pelo mesmo motivo acima).
 * - `active` (BOOLEAN, default true): plano pode ser desativado sem
 *   exclusão física (RF-FAC-059).
 *
 * `facility_cleaning_executions` (nova, RF-FAC-049): registro de
 * **execução** separado do plano — viabiliza o KPI de aderência
 * (execuções ÷ previstas no período, RF-FAC-050), que a tabela única
 * anterior não permitia calcular.
 *
 * RBAC (RF-FAC-057, fora do escopo desta migration): alteração do plano
 * exige nível `approve`; execução exige `operate` — decisão de
 * `accessModules.ts`/rotas, não de schema.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const scheduleColumns = await queryInterface.describeTable('facility_cleaning_schedules');

    if (!scheduleColumns.facility_area_id) {
      await queryInterface.addColumn('facility_cleaning_schedules', 'facility_area_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'facility_areas', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });
    }

    if (!scheduleColumns.responsible_employee_id) {
      await queryInterface.addColumn('facility_cleaning_schedules', 'responsible_employee_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'employees', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });
    }

    if (!scheduleColumns.active) {
      await queryInterface.addColumn('facility_cleaning_schedules', 'active', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      });
    }

    const scheduleIndexes = await queryInterface.showIndex('facility_cleaning_schedules');
    if (!scheduleIndexes.some((i) => i.name === 'idx_facility_cleaning_schedules_facility_area_id')) {
      await queryInterface.addIndex('facility_cleaning_schedules', ['facility_area_id'], { name: 'idx_facility_cleaning_schedules_facility_area_id' });
    }

    const tables = await queryInterface.showAllTables();
    if (!tables.includes('facility_cleaning_executions')) {
      await queryInterface.createTable('facility_cleaning_executions', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        plan_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'facility_cleaning_schedules', key: 'id' },
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE',
        },
        executed_at: { type: Sequelize.DATE, allowNull: false },
        executed_by: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'employees', key: 'id' },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        },
        ok: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        notes: { type: Sequelize.TEXT, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      });

      await queryInterface.addIndex('facility_cleaning_executions', ['plan_id'], { name: 'idx_facility_cleaning_executions_plan_id' });
      await queryInterface.addIndex('facility_cleaning_executions', ['executed_at'], { name: 'idx_facility_cleaning_executions_executed_at' });
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('facility_cleaning_executions');

    const scheduleColumns = await queryInterface.describeTable('facility_cleaning_schedules');
    try {
      await queryInterface.removeIndex('facility_cleaning_schedules', 'idx_facility_cleaning_schedules_facility_area_id');
    } catch (error) {
      // índice pode já não existir
    }
    if (scheduleColumns.active) {
      await queryInterface.removeColumn('facility_cleaning_schedules', 'active');
    }
    if (scheduleColumns.responsible_employee_id) {
      await queryInterface.removeColumn('facility_cleaning_schedules', 'responsible_employee_id');
    }
    if (scheduleColumns.facility_area_id) {
      await queryInterface.removeColumn('facility_cleaning_schedules', 'facility_area_id');
    }
  },
};
