/**
 * ⚖️ Model: JurLegalCaseEvent (Andamento processual — cronologia imutável)
 *
 * @module models/JurLegalCaseEvent
 *
 * Tabela `jur_legal_case_events` (migration `20260807-000264`, RF-JUR-014).
 * **Insert-only**: trigger `trg_jur_lock_legal_case_event` bloqueia 100%
 * de UPDATE/DELETE. `event_type='decision'` dispara pendência de
 * reavaliação de risco (RF-JUR-017), resolvida no use case, não em trigger.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type EventType = 'petition' | 'hearing' | 'decision' | 'appeal' | 'deposit' | 'other';

interface JurLegalCaseEventAttributes {
  id: number;
  legal_case_id: number;
  event_type: EventType;
  occurred_at: Date;
  description: string;
  document_url: string | null;
  created_by: number;
  readonly createdAt?: Date;
}

const JurLegalCaseEvent = sequelize.define<any, JurLegalCaseEventAttributes>('JurLegalCaseEvent', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  legal_case_id: { type: DataTypes.INTEGER, allowNull: false },
  event_type: { type: DataTypes.ENUM('petition', 'hearing', 'decision', 'appeal', 'deposit', 'other'), allowNull: false },
  occurred_at: { type: DataTypes.DATE, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },
  document_url: { type: DataTypes.STRING(255), allowNull: true },
  created_by: { type: DataTypes.INTEGER, allowNull: false },
}, {
  tableName: 'jur_legal_case_events',
  underscored: true,
  timestamps: true,
  updatedAt: false,
  indexes: [{ fields: ['legal_case_id', 'occurred_at'] }, { fields: ['event_type'] }],
});

export = JurLegalCaseEvent;
