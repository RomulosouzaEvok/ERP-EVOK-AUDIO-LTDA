/**
 * 💻 Model: ItTicketPriorityHistory (Histórico de reclassificação de prioridade)
 *
 * @module models/ItTicketPriorityHistory
 *
 * Tabela `it_ticket_priority_history` (migration `20260807-000151`).
 * Trilha de reclassificação de prioridade (quem, quando, de/para) exigida
 * por RF-TI-005/BR-TI-007.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

interface ItTicketPriorityHistoryAttributes {
  id: number;
  ticket_id: number;
  changed_by: number;
  previous_priority: TicketPriority;
  new_priority: TicketPriority;
  reason: string | null;
  changed_at: Date;
}

const ItTicketPriorityHistory = sequelize.define<any, ItTicketPriorityHistoryAttributes>('ItTicketPriorityHistory', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  ticket_id: { type: DataTypes.INTEGER, allowNull: false },
  changed_by: { type: DataTypes.INTEGER, allowNull: false },
  previous_priority: { type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'), allowNull: false },
  new_priority: { type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'), allowNull: false },
  reason: DataTypes.TEXT,
  changed_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: 'it_ticket_priority_history',
  underscored: true,
  timestamps: false,
  indexes: [{ fields: ['ticket_id'] }],
});

export = ItTicketPriorityHistory;
