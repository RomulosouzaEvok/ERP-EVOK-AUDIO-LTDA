/**
 * 🎯 Model: MarketingLead (Lead de Marketing)
 *
 * @module models/MarketingLead
 *
 * Lead captado pelo módulo Marketing (departamento 14, sigla MKT),
 * opcionalmente vinculado a uma `MarketingCampaign` (`campaign_id` nullable
 * — nem todo lead vem de uma campanha formal, ex. indicação espontânea).
 * O funil (`status`) é um caso de uso dedicado
 * (`ChangeLeadStatusUseCase`), não um `PUT` genérico irrestrito — ver
 * `server/src/modules/marketing/application/use-cases/lead/ChangeLeadStatusUseCase.ts`.
 * Quando o lead vira cliente real, `converted_to_customer_id` referencia o
 * `Client` correspondente (módulo `sales`/`clients` já existente).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type MarketingLeadSource =
  | 'website' | 'instagram' | 'facebook' | 'google' | 'email' | 'event' | 'indication' | 'other';
type MarketingLeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';

interface MarketingLeadAttributes {
  id: number;
  campaign_id: number | null;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  interest: string | null;
  lead_source: MarketingLeadSource | null;
  lead_score: number;
  status: MarketingLeadStatus;
  converted_to_customer_id: number | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const MarketingLead = sequelize.define('MarketingLead', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  campaign_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'marketing_campaigns', key: 'id' },
  },
  name: { type: DataTypes.STRING(200), allowNull: false },
  email: { type: DataTypes.STRING(100), allowNull: true },
  phone: { type: DataTypes.STRING(20), allowNull: true },
  company: { type: DataTypes.STRING(200), allowNull: true },
  interest: { type: DataTypes.STRING(255), allowNull: true },
  lead_source: {
    type: DataTypes.ENUM('website', 'instagram', 'facebook', 'google', 'email', 'event', 'indication', 'other'),
    allowNull: true,
  },
  lead_score: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  status: {
    type: DataTypes.ENUM('new', 'contacted', 'qualified', 'converted', 'lost'),
    allowNull: false,
    defaultValue: 'new',
  },
  converted_to_customer_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'clients', key: 'id' },
  },
}, {
  tableName: 'marketing_leads',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['campaign_id'], name: 'idx_marketing_leads_campaign_id' },
    { fields: ['status'], name: 'idx_marketing_leads_status' },
    { fields: ['converted_to_customer_id'], name: 'idx_marketing_leads_converted_to_customer_id' },
  ],
});

export = MarketingLead;
