/**
 * 👔 Model: HrJobPosition (Cargos — módulo RH, Bloco 6)
 *
 * Tabela `hr_job_positions` (migration `20260808-000010`). RF-RH-024 a 026
 * (P2 — não exposto por endpoint próprio nesta passada P0; usado apenas
 * como FK opcional de `hr_admission_processes`/`hr_employee_job_history`/
 * `employees.job_position_id`).
 *
 * @module models/HrJobPosition
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

const HrJobPosition = sequelize.define('HrJobPosition', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  department_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(150), allowNull: false },
  cbo_code: DataTypes.STRING(20),
  description: DataTypes.TEXT,
  salary_range_min: DataTypes.DECIMAL(12, 2),
  salary_range_max: DataTypes.DECIMAL(12, 2),
  requirements: DataTypes.TEXT,
  active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, {
  tableName: 'hr_job_positions',
  underscored: true,
  timestamps: true,
});

export = HrJobPosition;
