/**
 * 🔗 Model: WebhookEvent
 *
 * @module models/WebhookEvent
 *
 * Registro de idempotencia de eventos recebidos via webhook de sistemas
 * externos (ex.: n8n). Cada evento e identificado por `source` + `event_id`
 * (par unico), permitindo detectar e ignorar reentregas duplicadas do
 * mesmo evento sem reprocessar efeitos colaterais.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface WebhookEventAttributes {
  id: number;
  source: string;
  event_id: string;
  event_type: string | null;
  payload: Record<string, unknown> | null;
  received_at: Date;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const WebhookEvent = sequelize.define('WebhookEvent', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  source: { type: DataTypes.STRING(50), allowNull: false },
  event_id: { type: DataTypes.STRING(200), allowNull: false },
  event_type: DataTypes.STRING(100),
  payload: DataTypes.JSONB,
  received_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: 'webhook_events',
  underscored: true,
  timestamps: true,
});

export = WebhookEvent;
