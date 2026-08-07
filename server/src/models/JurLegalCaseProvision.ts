/**
 * ⚖️ Model: JurLegalCaseProvision (Provisão de Contingência — CPC 25)
 *
 * @module models/JurLegalCaseProvision
 *
 * Tabela `jur_legal_case_provisions` (migration `20260807-000266`,
 * RF-JUR-015/016/020). **Append-only**: cada reavaliação gera nova linha;
 * a vigente é sempre `ORDER BY assessed_at DESC LIMIT 1` por
 * `legal_case_id`. Trigger `trg_jur_lock_legal_case_provision` bloqueia
 * qualquer UPDATE/DELETE, sem exceção — é a série que a Controladoria
 * consome para o balanço.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type RiskClass = 'probable' | 'possible' | 'remote';

interface JurLegalCaseProvisionAttributes {
  id: number;
  legal_case_id: number;
  risk_class: RiskClass;
  claim_amount: string | null;
  provisioned_amount: string;
  rationale: string | null;
  assessed_by: number;
  assessed_at: Date;
  readonly createdAt?: Date;
}

const JurLegalCaseProvision = sequelize.define<any, JurLegalCaseProvisionAttributes>('JurLegalCaseProvision', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  legal_case_id: { type: DataTypes.INTEGER, allowNull: false },
  risk_class: { type: DataTypes.ENUM('probable', 'possible', 'remote'), allowNull: false },
  claim_amount: { type: DataTypes.DECIMAL(18, 6), allowNull: true },
  provisioned_amount: { type: DataTypes.DECIMAL(18, 6), allowNull: false, defaultValue: 0 },
  rationale: { type: DataTypes.TEXT, allowNull: true },
  assessed_by: { type: DataTypes.INTEGER, allowNull: false },
  assessed_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: 'jur_legal_case_provisions',
  underscored: true,
  timestamps: true,
  updatedAt: false,
  indexes: [{ fields: ['legal_case_id', 'assessed_at'] }, { fields: ['risk_class'] }],
});

export = JurLegalCaseProvision;
