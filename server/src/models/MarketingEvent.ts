/**
 * 🎪 Model: MarketingEvent (Evento/Feira — Marketing)
 *
 * @module models/MarketingEvent
 *
 * Evento/feira do módulo Marketing (departamento 14, sigla MKT), NOVO no
 * BLOCO 5 MKT (correção) — RF-MKT-020 a 025 (BR-MKT-009). Criável
 * independentemente de campanha (`campaign_id` FK opcional). Leads captados
 * no evento vinculam via `MarketingLead.event_id`; contagem de leads e
 * custo por lead são sempre derivados em tempo de leitura (RF-MKT-023/024
 * — nunca coluna própria). Fechamento (`status='completed'`) exige
 * `actual_cost` preenchido (RF-MKT-025, CHECK
 * `ck_marketing_events_completed_requires_actual_cost` no banco).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type MarketingEventType = 'feira' | 'lancamento' | 'workshop' | 'regional';
type MarketingEventStatus = 'planned' | 'in_progress' | 'completed' | 'canceled';

interface MarketingEventAttributes {
  id: number;
  name: string;
  location: string | null;
  event_type: MarketingEventType;
  campaign_id: number | null;
  start_date: string;
  end_date: string | null;
  budget: number | null;
  actual_cost: number | null;
  status: MarketingEventStatus;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const MarketingEvent = sequelize.define('MarketingEvent', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(200), allowNull: false },
  location: { type: DataTypes.STRING(255), allowNull: true },
  event_type: {
    type: DataTypes.ENUM('feira', 'lancamento', 'workshop', 'regional'),
    allowNull: false,
  },
  campaign_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'marketing_campaigns', key: 'id' },
  },
  start_date: { type: DataTypes.DATEONLY, allowNull: false },
  end_date: { type: DataTypes.DATEONLY, allowNull: true },
  budget: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
  actual_cost: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
  status: {
    type: DataTypes.ENUM('planned', 'in_progress', 'completed', 'canceled'),
    allowNull: false,
    defaultValue: 'planned',
  },
}, {
  tableName: 'marketing_events',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['campaign_id'], name: 'idx_marketing_events_campaign_id' },
    { fields: ['status'], name: 'idx_marketing_events_status' },
  ],
});

export = MarketingEvent;
