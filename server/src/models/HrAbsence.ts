/**
 * 🏥 Model: HrAbsence (Afastamentos — módulo RH, Bloco 6)
 *
 * Tabela `hr_absences` (migration `20260808-000020`). RF-RH-044 a 049,
 * UC-71. `cid` é dado de saúde (LGPD art. 5º II) — segregado na camada de
 * apresentação por `domain/services/rhSensitiveFields.ts` (`sanitizeAbsence`,
 * exige interseção `rh` + `sst`), nunca aqui no model.
 *
 * @module models/HrAbsence
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

const HrAbsence = sequelize.define('HrAbsence', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  employee_id: { type: DataTypes.INTEGER, allowNull: false },
  type: {
    type: DataTypes.ENUM('doenca_ate_15d', 'auxilio_doenca_inss', 'acidente_trabalho', 'maternidade', 'paternidade', 'licenca_outras'),
    allowNull: false,
  },
  start_date: { type: DataTypes.DATEONLY, allowNull: false },
  expected_end_date: DataTypes.DATEONLY,
  actual_end_date: DataTypes.DATEONLY,
  extended_program: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  cid: DataTypes.STRING(10),
  document_id: DataTypes.INTEGER,
  s2230_confirmed_at: DataTypes.DATE,
  s2230_confirmed_by: DataTypes.INTEGER,
  accrual_period_impact_id: DataTypes.INTEGER,
  accrual_impact_days: DataTypes.INTEGER,
  created_by: { type: DataTypes.INTEGER, allowNull: false },
}, {
  tableName: 'hr_absences',
  underscored: true,
  timestamps: true,
});

export = HrAbsence;
