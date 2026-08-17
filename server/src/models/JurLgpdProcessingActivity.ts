/**
 * ⚖️ Model: JurLgpdProcessingActivity (RoPA — Registro de Atividades de Tratamento)
 *
 * @module models/JurLgpdProcessingActivity
 *
 * Tabela `jur_lgpd_processing_activities` (migration `20260807-000271`,
 * RF-JUR-035/036, LGPD art. 37). Model criado nesta passada (P0); endpoints
 * do Grupo 6 (LGPD) ficam para a passada 2.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type LegalBasis =
  | 'consent' | 'legal_obligation' | 'public_administration' | 'research'
  | 'contract_execution' | 'judicial_process' | 'life_protection'
  | 'health_protection' | 'legitimate_interest' | 'credit_protection';

interface JurLgpdProcessingActivityAttributes {
  id: number;
  purpose: string;
  legal_basis: LegalBasis;
  data_categories: string;
  data_subject_categories: string;
  source_system: string | null;
  sharing_description: string | null;
  retention_period: string | null;
  retention_policy_id: number | null;
  security_measures: string | null;
  department_id: number;
  last_reviewed_at: string | null;
  next_review_due_at: string | null;
  created_by: number;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const JurLgpdProcessingActivity = sequelize.define<any, JurLgpdProcessingActivityAttributes>('JurLgpdProcessingActivity', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  purpose: { type: DataTypes.TEXT, allowNull: false },
  legal_basis: {
    type: DataTypes.ENUM('consent', 'legal_obligation', 'public_administration', 'research', 'contract_execution', 'judicial_process', 'life_protection', 'health_protection', 'legitimate_interest', 'credit_protection'),
    allowNull: false,
  },
  data_categories: { type: DataTypes.TEXT, allowNull: false },
  data_subject_categories: { type: DataTypes.TEXT, allowNull: false },
  source_system: { type: DataTypes.STRING(150), allowNull: true },
  sharing_description: { type: DataTypes.TEXT, allowNull: true },
  retention_period: { type: DataTypes.STRING(150), allowNull: true },
  retention_policy_id: { type: DataTypes.INTEGER, allowNull: true },
  security_measures: { type: DataTypes.TEXT, allowNull: true },
  department_id: { type: DataTypes.INTEGER, allowNull: false },
  last_reviewed_at: { type: DataTypes.DATEONLY, allowNull: true },
  next_review_due_at: { type: DataTypes.DATEONLY, allowNull: true },
  created_by: { type: DataTypes.INTEGER, allowNull: false },
}, {
  tableName: 'jur_lgpd_processing_activities',
  underscored: true,
  timestamps: true,
  indexes: [{ fields: ['department_id'] }, { fields: ['next_review_due_at'] }, { fields: ['retention_policy_id'] }],
});

export = JurLgpdProcessingActivity;
