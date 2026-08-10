/**
 * 🏖️ Model: HrVacationAccrualPeriod (Período Aquisitivo/Concessivo de Férias — módulo RH, Bloco 6)
 *
 * Tabela `hr_vacation_accrual_periods` (migration `20260808-000018`).
 * RF-RH-031 a 034, 041 a 043 (P0, maior risco legal do bloco — UC-67).
 * Imutável por linha nos campos estruturais (`employee_id`, `period_start`,
 * `period_end`, `concessive_end`) — trigger `hr_lock_vacation_accrual_period`.
 *
 * @module models/HrVacationAccrualPeriod
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

const HrVacationAccrualPeriod = sequelize.define('HrVacationAccrualPeriod', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  employee_id: { type: DataTypes.INTEGER, allowNull: false },
  period_start: { type: DataTypes.DATEONLY, allowNull: false },
  period_end: { type: DataTypes.DATEONLY, allowNull: false },
  concessive_end: { type: DataTypes.DATEONLY, allowNull: false },
  unexcused_absences: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  entitled_days: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 30 },
  days_taken: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  status: {
    type: DataTypes.ENUM('em_curso', 'programado', 'gozado', 'vencido_dobra', 'zerado'),
    allowNull: false,
    defaultValue: 'em_curso',
  },
  zeroed_reason: DataTypes.TEXT,
  zeroed_from_period_id: DataTypes.INTEGER,
}, {
  tableName: 'hr_vacation_accrual_periods',
  underscored: true,
  timestamps: true,
});

export = HrVacationAccrualPeriod;
