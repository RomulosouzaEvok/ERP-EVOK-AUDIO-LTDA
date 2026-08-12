/**
 * ⚠️ Model: BusinessRisk (Risco Corporativo — Diretoria)
 *
 * @module models/BusinessRisk
 *
 * `risk_score` é SEMPRE calculado no servidor (`probability × impact`,
 * mapeados `low=1, medium=2, high=3, critical=4`) — nunca aceito do payload
 * (ver `CalculateRiskScore`, `server/src/modules/directorate/domain/services/`).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type RiskCategory = 'operational' | 'financial' | 'market' | 'regulatory' | 'reputation' | 'supply';
type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
type RiskStatus = 'active' | 'mitigated' | 'accepted' | 'closed';

interface BusinessRiskAttributes {
  id: number;
  risk_category: RiskCategory;
  description: string;
  probability: RiskLevel;
  impact: RiskLevel;
  risk_score: number;
  mitigation_actions: string | null;
  contingency_plan: string | null;
  responsible_id: number | null;
  review_date: string | null;
  status: RiskStatus;
  created_by: number;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const BusinessRisk = sequelize.define(
  'BusinessRisk',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    risk_category: {
      type: DataTypes.ENUM('operational', 'financial', 'market', 'regulatory', 'reputation', 'supply'),
      allowNull: false,
    },
    description: { type: DataTypes.TEXT, allowNull: false },
    probability: { type: DataTypes.ENUM('low', 'medium', 'high', 'critical'), allowNull: false },
    impact: { type: DataTypes.ENUM('low', 'medium', 'high', 'critical'), allowNull: false },
    risk_score: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'probability x impact (1..4 cada). Calculado no servidor, nunca aceito do payload',
    },
    mitigation_actions: { type: DataTypes.TEXT, allowNull: true },
    contingency_plan: { type: DataTypes.TEXT, allowNull: true },
    responsible_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK -> employees.id' },
    review_date: { type: DataTypes.DATEONLY, allowNull: true },
    status: {
      type: DataTypes.ENUM('active', 'mitigated', 'accepted', 'closed'),
      allowNull: false,
      defaultValue: 'active',
    },
    created_by: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK -> users.id' },
  },
  {
    tableName: 'business_risks',
    underscored: true,
    timestamps: true,
    indexes: [
      { fields: ['status'] },
      { fields: ['risk_category'] },
    ],
  },
);

export = BusinessRisk;
