/**
 * 📣 Model: MarketingCampaign (Campanha de Marketing)
 *
 * @module models/MarketingCampaign
 *
 * Cadastro de campanha do módulo Marketing (departamento 14, sigla MKT —
 * ver `docs/comercial/02-MARKETING.md`). Cobre campanhas de mídia paga
 * (`ads`), redes sociais (`social`), email marketing, eventos/feiras,
 * trade marketing e conteúdo.
 *
 * BLOCO 5 MKT (correção): `budget` foi renomeado para `budget_requested`
 * (RF-MKT-030) e a campanha ganhou fluxo de aprovação de orçamento
 * (`budget_approved`/`budget_approval_status`/`budget_approved_by`/
 * `budget_approved_at`) — transitar para `status='active'` exige
 * `budget_approval_status='approved'` (RF-MKT-031, CHECK
 * `ck_marketing_campaigns_active_requires_budget_approval` no banco).
 * `leads_generated`/`conversions`/`roi` permanecem colunas de CACHE
 * (RF-MKT-007/008/009) — nunca aceitas via `PUT`/`POST`, sempre
 * recalculadas a partir de vínculos reais (criação/conversão de lead ou
 * `POST /campaigns/:id/recalculate-metrics`); `metrics_recalculated_at`
 * marca a última reconciliação. `notes` é o único campo editável quando
 * `status IN ('completed', 'canceled')` (RF-MKT-034).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type MarketingCampaignType = 'ads' | 'social' | 'email' | 'event' | 'trade' | 'content';
type MarketingCampaignStatus = 'planned' | 'active' | 'paused' | 'completed' | 'canceled';
type MarketingBudgetApprovalStatus = 'pending' | 'approved' | 'rejected';

interface MarketingCampaignAttributes {
  id: number;
  name: string;
  description: string | null;
  campaign_type: MarketingCampaignType;
  start_date: string;
  end_date: string | null;
  budget_requested: number | null;
  budget_approved: number | null;
  budget_approval_status: MarketingBudgetApprovalStatus;
  budget_approved_by: number | null;
  budget_approved_at: Date | null;
  actual_cost: number;
  target_audience: string | null;
  channel: string | null;
  leads_generated: number;
  conversions: number;
  roi: number | null;
  metrics_recalculated_at: Date | null;
  notes: string | null;
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
  budget_requested: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
  budget_approved: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
  budget_approval_status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    allowNull: false,
    defaultValue: 'pending',
  },
  budget_approved_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'users', key: 'id' },
  },
  budget_approved_at: { type: DataTypes.DATE, allowNull: true },
  actual_cost: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  target_audience: { type: DataTypes.STRING(255), allowNull: true },
  channel: { type: DataTypes.STRING(100), allowNull: true },
  leads_generated: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  conversions: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  roi: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  metrics_recalculated_at: { type: DataTypes.DATE, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
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
