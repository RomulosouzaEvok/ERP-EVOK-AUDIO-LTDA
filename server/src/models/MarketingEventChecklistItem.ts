/**
 * ✅ Model: MarketingEventChecklistItem (Item de Checklist de Evento)
 *
 * @module models/MarketingEventChecklistItem
 *
 * Item de checklist livre de um `MarketingEvent`, NOVO no BLOCO 5 MKT
 * (correção) — RF-MKT-021. Estrutura simples e configurável (sem enum
 * fechado de categoria — decisão explícita do brief: "não engessar em
 * código"), tabela filha (não JSONB) para permitir `responsible_user_id`
 * como FK real e `status` consultável/filtrável por item.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type MarketingEventChecklistItemStatus = 'pending' | 'done';

interface MarketingEventChecklistItemAttributes {
  id: number;
  event_id: number;
  description: string;
  status: MarketingEventChecklistItemStatus;
  responsible_user_id: number | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const MarketingEventChecklistItem = sequelize.define('MarketingEventChecklistItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  event_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'marketing_events', key: 'id' },
  },
  description: { type: DataTypes.STRING(255), allowNull: false },
  status: {
    type: DataTypes.ENUM('pending', 'done'),
    allowNull: false,
    defaultValue: 'pending',
  },
  responsible_user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'users', key: 'id' },
  },
}, {
  tableName: 'marketing_event_checklist_items',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['event_id'], name: 'idx_marketing_event_checklist_items_event_id' },
    { fields: ['responsible_user_id'], name: 'idx_marketing_event_checklist_items_responsible_user_id' },
  ],
});

export = MarketingEventChecklistItem;
