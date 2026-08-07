/**
 * 💻 Model: ItTicket (Chamado de TI — Helpdesk)
 *
 * @module models/ItTicket
 *
 * Tabela `it_tickets` (migration `20260807-000150`). Núcleo do helpdesk de
 * TI (UC-49). `requester_id` é sempre populado a partir do JWT pela
 * aplicação (BR-TI-002); é `NULL` apenas quando `system_generated=true`
 * (chamado automático de falha de backup, RF-TI-040). Nenhum chamado é
 * apagado (RF-TI-016) — cancelamento usa `status='canceled'`.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
type TicketStatus = 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed' | 'canceled';

interface ItTicketAttributes {
  id: number;
  ticket_number: string;
  requester_id: number | null;
  system_generated: boolean;
  opened_on_behalf_of: number | null;
  category_id: number;
  priority: TicketPriority;
  impact: number | null;
  urgency: number | null;
  subject: string;
  description: string | null;
  asset_id: number | null;
  assigned_to: number | null;
  status: TicketStatus;
  solution: string | null;
  maintenance_order_id: number | null;
  access_request_id: number | null;
  first_response_at: Date | null;
  resolved_at: Date | null;
  closed_at: Date | null;
  sla_response_due_at: Date | null;
  sla_resolution_due_at: Date | null;
  waiting_minutes: number;
  satisfaction_rating: number | null;
  satisfaction_comment: string | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const ItTicket = sequelize.define<any, ItTicketAttributes>('ItTicket', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  ticket_number: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  requester_id: { type: DataTypes.INTEGER, allowNull: true },
  system_generated: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  opened_on_behalf_of: { type: DataTypes.INTEGER, allowNull: true },
  category_id: { type: DataTypes.INTEGER, allowNull: false },
  priority: { type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'), allowNull: false },
  impact: { type: DataTypes.SMALLINT, allowNull: true },
  urgency: { type: DataTypes.SMALLINT, allowNull: true },
  subject: { type: DataTypes.STRING(200), allowNull: false },
  description: DataTypes.TEXT,
  asset_id: { type: DataTypes.INTEGER, allowNull: true },
  assigned_to: { type: DataTypes.INTEGER, allowNull: true },
  status: { type: DataTypes.ENUM('open', 'in_progress', 'waiting', 'resolved', 'closed', 'canceled'), allowNull: false, defaultValue: 'open' },
  solution: DataTypes.TEXT,
  maintenance_order_id: { type: DataTypes.INTEGER, allowNull: true },
  access_request_id: { type: DataTypes.INTEGER, allowNull: true },
  first_response_at: DataTypes.DATE,
  resolved_at: DataTypes.DATE,
  closed_at: DataTypes.DATE,
  sla_response_due_at: DataTypes.DATE,
  sla_resolution_due_at: DataTypes.DATE,
  waiting_minutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  satisfaction_rating: { type: DataTypes.SMALLINT, allowNull: true },
  satisfaction_comment: DataTypes.TEXT,
}, {
  tableName: 'it_tickets',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['requester_id'] },
    { fields: ['assigned_to'] },
    { fields: ['status'] },
    { fields: ['category_id'] },
    { fields: ['asset_id'] },
    { fields: ['priority'] },
  ],
});

export = ItTicket;
