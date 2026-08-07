/**
 * ✅ Model: FacilityCleaningExecution (Execução de Limpeza — Facilities)
 *
 * @module models/FacilityCleaningExecution
 *
 * Tabela `facility_cleaning_executions` (migration `20260807-000297`).
 * Registro de execução separado do plano (`FacilityCleaningSchedule`) —
 * viabiliza o KPI de aderência (execuções ÷ previstas no período,
 * RF-FAC-050).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface FacilityCleaningExecutionAttributes {
  id: number;
  plan_id: number;
  executed_at: Date;
  executed_by: number | null;
  ok: boolean;
  notes: string | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const FacilityCleaningExecution = sequelize.define<any, FacilityCleaningExecutionAttributes>('FacilityCleaningExecution', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  plan_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK → facility_cleaning_schedules.id' },
  executed_at: { type: DataTypes.DATE, allowNull: false },
  executed_by: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK → employees.id' },
  ok: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'facility_cleaning_executions',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['plan_id'], name: 'idx_facility_cleaning_executions_plan_id' },
    { fields: ['executed_at'], name: 'idx_facility_cleaning_executions_executed_at' },
  ],
});

export = FacilityCleaningExecution;
