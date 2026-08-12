/**
 * 🎁 Model: HrEmployeeBenefit (Adesão de Funcionário a Benefício — módulo RH, Bloco 6)
 *
 * Tabela `hr_employee_benefits` (migration `20260808-000021`). RF-RH-051 a
 * 054. **Nunca excluído fisicamente** — o banco tem trigger
 * (`trg_hr_block_delete_employee_benefit`) que bloqueia `DELETE`;
 * cancelamento é `enrollment_status='cancelado'` + `canceled_at`.
 * `discount_value` é dado sensível (financeiro individual, segue a
 * segregação padrão do módulo `rh`).
 *
 * @module models/HrEmployeeBenefit
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

const HrEmployeeBenefit = sequelize.define('HrEmployeeBenefit', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  employee_id: { type: DataTypes.INTEGER, allowNull: false },
  benefit_type_id: { type: DataTypes.INTEGER, allowNull: false },
  enrollment_status: { type: DataTypes.ENUM('ativo', 'cancelado'), allowNull: false, defaultValue: 'ativo' },
  enrolled_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  canceled_at: DataTypes.DATE,
  discount_value: DataTypes.DECIMAL(12, 2),
  company_cost_value: DataTypes.DECIMAL(12, 2),
  dependents: DataTypes.JSONB,
  suspended_days: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  created_by: { type: DataTypes.INTEGER, allowNull: false },
}, {
  tableName: 'hr_employee_benefits',
  underscored: true,
  timestamps: true,
});

export = HrEmployeeBenefit;
