/**
 * 📄 Model: HrEmployeeContract (Contrato de Experiência/Vínculo — módulo RH, Bloco 6)
 *
 * Tabela `hr_employee_contracts` (migration `20260808-000014`). RF-RH-013 a
 * 016 (P0 — UC-68). Imutável por linha após o INSERT, exceto `status`,
 * `effective_end_date` e uma única gravação de `period_2_end_date`
 * (trigger `hr_lock_employee_contract` no banco — RNF-RH-04).
 *
 * @module models/HrEmployeeContract
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

const HrEmployeeContract = sequelize.define('HrEmployeeContract', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  employee_id: { type: DataTypes.INTEGER, allowNull: false },
  type: {
    type: DataTypes.ENUM('indeterminado', 'experiencia', 'aprendiz', 'estagio'),
    allowNull: false,
  },
  start_date: { type: DataTypes.DATEONLY, allowNull: false },
  period_1_end_date: DataTypes.DATEONLY,
  period_2_end_date: DataTypes.DATEONLY,
  effective_end_date: DataTypes.DATEONLY,
  status: {
    type: DataTypes.ENUM('ativo', 'prorrogado', 'efetivado', 'indeterminado_automatico', 'rescindido'),
    allowNull: false,
    defaultValue: 'ativo',
  },
  created_by: { type: DataTypes.INTEGER, allowNull: false },
}, {
  tableName: 'hr_employee_contracts',
  underscored: true,
  timestamps: true,
});

export = HrEmployeeContract;
