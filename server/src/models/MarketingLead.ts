/**
 * 🎯 Model: MarketingLead (Lead de Marketing)
 *
 * @module models/MarketingLead
 *
 * Lead captado pelo módulo Marketing (departamento 14, sigla MKT),
 * opcionalmente vinculado a uma `MarketingCampaign` (`campaign_id` nullable
 * — nem todo lead vem de uma campanha formal, ex. indicação espontânea) e/ou
 * a um `MarketingEvent` (`event_id` nullable — captação em feira/evento,
 * BLOCO 5 MKT correção, RF-MKT-020/022). O funil (`status`) é um caso de
 * uso dedicado (`ChangeLeadStatusUseCase`), não um `PUT` genérico irrestrito
 * — ver `server/src/modules/marketing/application/use-cases/lead/ChangeLeadStatusUseCase.ts`.
 * Quando o lead vira cliente real, `converted_to_customer_id` referencia o
 * `Client` correspondente (módulo `clients`) — a conversão é sempre atômica
 * via `POST /api/marketing/leads/:id/convert` (RF-MKT-001/002/003, UC-63),
 * nunca via `POST .../status`.
 *
 * Handoff Marketing → Vendas (RF-MKT-011 a 015, UC-64): `sales_owner_user_id`
 * é o vendedor responsável, `qualified_at`/`handoff_at` sustentam o cálculo
 * de SLA, `first_response_at` apoia o KPI de tempo de ciclo (RF-MKT-026).
 *
 * `needs_review` (BLOCO 5 MKT correção, migration `20260807-000312`):
 * marca leads rebaixados pelo saneamento de dado órfão (`converted` sem
 * cliente vinculado, estado inválido pré-existente) — ver
 * `docs/business/BLOCO_5_MKT_MODELO_DADOS.md` §3.2.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type MarketingLeadSource =
  | 'website' | 'instagram' | 'facebook' | 'google' | 'email' | 'event' | 'indication' | 'other';
type MarketingLeadStatus =
  | 'new' | 'contacted' | 'qualified' | 'in_sales_attendance' | 'converted' | 'lost';
type MarketingConsentChannel =
  | 'formulario_site' | 'whatsapp' | 'telefone' | 'feira' | 'indicacao' | 'outro';

interface MarketingLeadAttributes {
  id: number;
  campaign_id: number | null;
  event_id: number | null;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  interest: string | null;
  lead_source: MarketingLeadSource | null;
  lead_score: number;
  status: MarketingLeadStatus;
  qualified_at: Date | null;
  sales_owner_user_id: number | null;
  handoff_at: Date | null;
  first_response_at: Date | null;
  converted_to_customer_id: number | null;
  converted_at: Date | null;
  consent_given: boolean;
  consent_date: Date | null;
  consent_channel: MarketingConsentChannel | null;
  needs_review: boolean;
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
  event_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'marketing_events', key: 'id' },
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
    type: DataTypes.ENUM('new', 'contacted', 'qualified', 'in_sales_attendance', 'converted', 'lost'),
    allowNull: false,
    defaultValue: 'new',
  },
  qualified_at: { type: DataTypes.DATE, allowNull: true },
  sales_owner_user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'users', key: 'id' },
  },
  handoff_at: { type: DataTypes.DATE, allowNull: true },
  first_response_at: { type: DataTypes.DATE, allowNull: true },
  converted_to_customer_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'clients', key: 'id' },
  },
  converted_at: { type: DataTypes.DATE, allowNull: true },
  consent_given: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  consent_date: { type: DataTypes.DATE, allowNull: true },
  consent_channel: {
    type: DataTypes.ENUM('formulario_site', 'whatsapp', 'telefone', 'feira', 'indicacao', 'outro'),
    allowNull: true,
  },
  needs_review: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, {
  tableName: 'marketing_leads',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['campaign_id'], name: 'idx_marketing_leads_campaign_id' },
    { fields: ['event_id'], name: 'idx_marketing_leads_event_id' },
    { fields: ['status'], name: 'idx_marketing_leads_status' },
    { fields: ['converted_to_customer_id'], name: 'idx_marketing_leads_converted_to_customer_id' },
    { fields: ['sales_owner_user_id'], name: 'idx_marketing_leads_sales_owner_user_id' },
    { fields: ['needs_review'], name: 'idx_marketing_leads_needs_review' },
  ],
});

export = MarketingLead;
