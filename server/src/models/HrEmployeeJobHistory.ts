/**
 * 📈 Model: HrEmployeeJobHistory (Histórico Contratual — módulo RH, Bloco 6)
 *
 * Tabela `hr_employee_job_history` (migration `20260808-000013`). RF-RH-064
 * a 066 (P1 — usado nesta passada P0 apenas para o registro inicial criado
 * na conclusão da Admissão, RF-RH-009). Imutável por linha (trigger
 * `hr_lock_job_history`), exceto `effective_to`,
 * `pending_aso_risk_change`, `esocial_event_confirmed_at/by`.
 *
 * @module models/HrEmployeeJobHistory
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

const HrEmployeeJobHistory = sequelize.define('HrEmployeeJobHistory', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  employee_id: { type: DataTypes.INTEGER, allowNull: false },
  job_position_id: DataTypes.INTEGER,
  department_id: { type: DataTypes.INTEGER, allowNull: false },
  salary: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  effective_from: { type: DataTypes.DATEONLY, allowNull: false },
  effective_to: DataTypes.DATEONLY,
  reason: {
    type: DataTypes.ENUM('admissao', 'promocao', 'transferencia', 'reajuste'),
    allowNull: false,
  },
  pending_aso_risk_change: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  esocial_event_confirmed_at: DataTypes.DATE,
  esocial_event_confirmed_by: DataTypes.INTEGER,
  created_by: { type: DataTypes.INTEGER, allowNull: false },
}, {
  tableName: 'hr_employee_job_history',
  underscored: true,
  timestamps: true,
});

export = HrEmployeeJobHistory;
