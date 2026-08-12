/**
 * 🎁 Model: HrBenefitType (Catálogo de Tipos de Benefício — módulo RH, Bloco 6)
 *
 * Tabela `hr_benefit_types` (migration `20260808-000021`). RF-RH-050. Sem
 * exclusão física (catálogo referenciado por `hr_employee_benefits`) — usa
 * `active: false`.
 *
 * @module models/HrBenefitType
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

const HrBenefitType = sequelize.define('HrBenefitType', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(150), allowNull: false },
  category: {
    type: DataTypes.ENUM('vt', 'vr', 'va', 'saude', 'odonto', 'vida', 'outros'),
    allowNull: false,
  },
  funding_rule: { type: DataTypes.ENUM('percentual', 'fixo'), allowNull: false },
  supplier: DataTypes.STRING(150),
  active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, {
  tableName: 'hr_benefit_types',
  underscored: true,
  timestamps: true,
});

export = HrBenefitType;
