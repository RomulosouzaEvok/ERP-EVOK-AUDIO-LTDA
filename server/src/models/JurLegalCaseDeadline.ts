/**
 * ⚖️ Model: JurLegalCaseDeadline (Prazo Processual Fatal — núcleo crítico)
 *
 * @module models/JurLegalCaseDeadline
 *
 * Tabela `jur_legal_case_deadlines` (migration `20260807-000265`, UC-54,
 * RF-JUR-021 a 025, RNF-JUR-04). Máquina de estados de DUPLA CONFIRMAÇÃO:
 * `pending → fulfilled_pending_confirmation → confirmed`, ou
 * `pending → missed → fulfilled_pending_confirmation (retroativo) → confirmed_late`.
 * `fulfilled_by ≠ confirmed_by` é imposto por CHECK de banco
 * (`ck_jur_legal_case_deadlines_fulfilled_confirmed_distinct`) além da
 * validação de aplicação em `ConfirmDeadlineUseCase`. `responsible_user_id`
 * é NOT NULL sem exceção (RF-JUR-021). Trigger
 * `trg_jur_lock_legal_case_deadline` bloqueia DELETE sempre e UPDATE
 * quando `status IN ('confirmed','confirmed_late')`.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type DeadlineStatus = 'pending' | 'fulfilled_pending_confirmation' | 'confirmed' | 'missed' | 'confirmed_late';

interface JurLegalCaseDeadlineAttributes {
  id: number;
  legal_case_id: number;
  description: string;
  due_date: string;
  is_fatal: boolean;
  responsible_user_id: number;
  backup_user_id: number | null;
  escalation_user_id: number | null;
  status: DeadlineStatus;
  acknowledged_at: Date | null;
  evidence_file_path: string | null;
  fulfilled_by: number | null;
  fulfilled_at: Date | null;
  confirmed_by: number | null;
  confirmed_at: Date | null;
  escalated_at: Date | null;
  missed_at: Date | null;
  retroactive_justification: string | null;
  created_by: number;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const JurLegalCaseDeadline = sequelize.define<any, JurLegalCaseDeadlineAttributes>('JurLegalCaseDeadline', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  legal_case_id: { type: DataTypes.INTEGER, allowNull: false },
  description: { type: DataTypes.STRING(200), allowNull: false },
  due_date: { type: DataTypes.DATEONLY, allowNull: false },
  is_fatal: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  responsible_user_id: { type: DataTypes.INTEGER, allowNull: false },
  backup_user_id: { type: DataTypes.INTEGER, allowNull: true },
  escalation_user_id: { type: DataTypes.INTEGER, allowNull: true },
  status: {
    type: DataTypes.ENUM('pending', 'fulfilled_pending_confirmation', 'confirmed', 'missed', 'confirmed_late'),
    allowNull: false,
    defaultValue: 'pending',
  },
  acknowledged_at: { type: DataTypes.DATE, allowNull: true },
  evidence_file_path: { type: DataTypes.STRING(255), allowNull: true },
  fulfilled_by: { type: DataTypes.INTEGER, allowNull: true },
  fulfilled_at: { type: DataTypes.DATE, allowNull: true },
  confirmed_by: { type: DataTypes.INTEGER, allowNull: true },
  confirmed_at: { type: DataTypes.DATE, allowNull: true },
  escalated_at: { type: DataTypes.DATE, allowNull: true },
  missed_at: { type: DataTypes.DATE, allowNull: true },
  retroactive_justification: { type: DataTypes.TEXT, allowNull: true },
  created_by: { type: DataTypes.INTEGER, allowNull: false },
}, {
  tableName: 'jur_legal_case_deadlines',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['legal_case_id'] },
    { fields: ['responsible_user_id'] },
    { fields: ['status'] },
    { fields: ['due_date'] },
    { fields: ['is_fatal'] },
  ],
});

export = JurLegalCaseDeadline;
