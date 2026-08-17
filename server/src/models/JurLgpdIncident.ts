/**
 * ⚖️ Model: JurLgpdIncident (Incidente de Segurança — LGPD art. 48)
 *
 * @module models/JurLgpdIncident
 *
 * Tabela `jur_lgpd_incidents` (migration `20260807-000271`, RF-JUR-040).
 * Model criado nesta passada (P0); endpoints do Grupo 6 (LGPD) ficam para
 * a passada 2. Fechamento (`status='closed'`) exige `communication_decision`
 * + `communication_justification` preenchidos (CHECK de banco).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type CommunicationDecision = 'communicate_anpd' | 'communicate_subjects' | 'communicate_both' | 'not_communicate';
type IncidentStatus = 'open' | 'investigating' | 'closed';

interface JurLgpdIncidentAttributes {
  id: number;
  occurred_at: Date | null;
  detected_at: Date;
  description: string;
  affected_categories: string | null;
  affected_data_subjects_estimate: number | null;
  risk_assessment: string;
  communication_decision: CommunicationDecision | null;
  communication_justification: string | null;
  action_plan: string | null;
  status: IncidentStatus;
  dpo_user_id: number;
  assessment_due_at: Date | null;
  closed_at: Date | null;
  created_by: number;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const JurLgpdIncident = sequelize.define<any, JurLgpdIncidentAttributes>('JurLgpdIncident', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  occurred_at: { type: DataTypes.DATE, allowNull: true },
  detected_at: { type: DataTypes.DATE, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },
  affected_categories: { type: DataTypes.TEXT, allowNull: true },
  affected_data_subjects_estimate: { type: DataTypes.INTEGER, allowNull: true },
  risk_assessment: { type: DataTypes.TEXT, allowNull: false },
  communication_decision: { type: DataTypes.ENUM('communicate_anpd', 'communicate_subjects', 'communicate_both', 'not_communicate'), allowNull: true },
  communication_justification: { type: DataTypes.TEXT, allowNull: true },
  action_plan: { type: DataTypes.TEXT, allowNull: true },
  status: { type: DataTypes.ENUM('open', 'investigating', 'closed'), allowNull: false, defaultValue: 'open' },
  dpo_user_id: { type: DataTypes.INTEGER, allowNull: false },
  assessment_due_at: { type: DataTypes.DATE, allowNull: true },
  closed_at: { type: DataTypes.DATE, allowNull: true },
  created_by: { type: DataTypes.INTEGER, allowNull: false },
}, {
  tableName: 'jur_lgpd_incidents',
  underscored: true,
  timestamps: true,
  indexes: [{ fields: ['status'] }, { fields: ['dpo_user_id'] }, { fields: ['assessment_due_at'] }],
});

export = JurLgpdIncident;
