/**
 * 📣 Model: MarketingCampaign (Campanha de Marketing)
 *
 * @module models/MarketingCampaign
 *
 * Cadastro de campanha do módulo Marketing (departamento 14, sigla MKT —
 * ver `docs/comercial/02-MARKETING.md`). Cobre campanhas de mídia paga
 * (`ads`), redes sociais (`social`), email marketing, eventos/feiras,
 * trade marketing e conteúdo. `roi` pode ser informado manualmente ou
 * calculado no frontend a partir de `actual_cost`/receita gerada pelas
 * conversões — o backend não impõe a fórmula, apenas persiste o valor.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type MarketingCampaignType = 'ads' | 'social' | 'email' | 'event' | 'trade' | 'content';
type MarketingCampaignStatus = 'planned' | 'active' | 'paused' | 'completed' | 'canceled';

interface MarketingCampaignAttributes {
  id: number;
  name: string;
  description: string | null;
  campaign_type: MarketingCampaignType;
  start_date: string;
  end_date: string | null;
  budget: number | null;
  actual_cost: number;
  target_audience: string | null;
  channel: string | null;
  leads_generated: number;
  conversions: number;
  roi: number | null;
  status: MarketingCampaignStatus;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const MarketingCampaign = sequelize.define('MarketingCampaign', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(200), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  campaign_type: { type: DataTypes.ENUM('ads', 'social', 'email', 'event', 'trade', 'content'), allowNull: false },
  start_date: { type: DataTypes.DATEONLY, allowNull: false },
  end_date: { type: DataTypes.DATEONLY, allowNull: true },
  budget: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
  actual_cost: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  target_audience: { type: DataTypes.STRING(255), allowNull: true },
  channel: { type: DataTypes.STRING(100), allowNull: true },
  leads_generated: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  conversions: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  roi: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  status: {
    type: DataTypes.ENUM('planned', 'active', 'paused', 'completed', 'canceled'),
    allowNull: false,
    defaultValue: 'planned',
  },
}, {
  tableName: 'marketing_campaigns',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['status'], name: 'idx_marketing_campaigns_status' },
    { fields: ['campaign_type'], name: 'idx_marketing_campaigns_campaign_type' },
  ],
});

export = MarketingCampaign;
