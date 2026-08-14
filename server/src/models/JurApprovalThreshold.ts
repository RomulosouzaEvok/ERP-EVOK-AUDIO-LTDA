/**
 * ⚖️ Model: JurApprovalThreshold — faixa configurável de alçada de aprovação
 * de contrato jurídico (RF-JUR-003).
 *
 * Tabela `jur_approval_thresholds` (migration `20260814-000048`), criada na
 * remediação de `FIND-ERP-005` / Falha 1, por decisão do dono registrada em
 * `APR-2026-021` Parte B decisão 3 (**alçada = tabela configurável**).
 * Substitui os literais `50000`/`300000` que viviam em
 * `server/src/modules/juridico/domain/constants.ts`.
 *
 * A interpretação das faixas (comparação, precedência, vigência) mora em
 * `modules/juridico/domain/approvalPolicy.ts` — este model guarda apenas o
 * dado. Toda alteração passa por
 * `PUT /api/jur/settings/approval-thresholds` (nível `juridico:approve`,
 * validação server-side) e é registrada em `JurApprovalThresholdHistory`.
 *
 * @module models/JurApprovalThreshold
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface JurApprovalThresholdAttributes {
  id: number;
  contract_type: string;
  min_value: string;
  max_value: string | null;
  required_roles: string[];
  required_level: 'operate' | 'approve';
  active: boolean;
  valid_from: string | null;
  valid_to: string | null;
  notes: string | null;
  created_by: number | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const JurApprovalThreshold = sequelize.define<any, JurApprovalThresholdAttributes>('JurApprovalThreshold', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  contract_type: { type: DataTypes.STRING(40), allowNull: false, defaultValue: '*' },
  min_value: { type: DataTypes.DECIMAL(18, 6), allowNull: false, defaultValue: 0 },
  max_value: { type: DataTypes.DECIMAL(18, 6), allowNull: true },
  required_roles: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  required_level: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'approve' },
  active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  valid_from: { type: DataTypes.DATEONLY, allowNull: true },
  valid_to: { type: DataTypes.DATEONLY, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
  created_by: { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName: 'jur_approval_thresholds',
  underscored: true,
  timestamps: true,
  indexes: [{ fields: ['contract_type', 'active'] }],
});

export = JurApprovalThreshold;
