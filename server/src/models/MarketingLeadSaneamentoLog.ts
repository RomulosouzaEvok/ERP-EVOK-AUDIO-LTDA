/**
 * 🧾 Model: MarketingLeadSaneamentoLog (Auditoria de Saneamento de Lead)
 *
 * @module models/MarketingLeadSaneamentoLog
 *
 * Tabela de auditoria PERMANENTE (não um log volátil de migração) do
 * saneamento de leads `converted` órfãos (sem `converted_to_customer_id`
 * preenchido — estado inválido pré-existente à correção do BLOCO 5 MKT),
 * criada pela migration `20260807-000312`. Cada lead rebaixado por essa
 * migration (ou por uma futura rotina equivalente de saneamento) ganha uma
 * linha aqui ANTES do `UPDATE` que muda seu status, preservando
 * `previous_status`/`reverted_to_status`/`reason`/`reverted_at` para
 * rastreabilidade total — ver `docs/business/BLOCO_5_MKT_MODELO_DADOS.md`
 * §3.2.
 *
 * Sem `updated_at` (tabela somente-inserção, `timestamps: false` com
 * `created_at` explícito).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface MarketingLeadSaneamentoLogAttributes {
  id: number;
  lead_id: number;
  previous_status: string;
  reverted_to_status: string;
  reason: string;
  reverted_at: Date;
  readonly created_at?: Date;
}

const MarketingLeadSaneamentoLog = sequelize.define('MarketingLeadSaneamentoLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  lead_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'marketing_leads', key: 'id' },
  },
  previous_status: { type: DataTypes.STRING(30), allowNull: false },
  reverted_to_status: { type: DataTypes.STRING(30), allowNull: false },
  reason: { type: DataTypes.TEXT, allowNull: false },
  reverted_at: { type: DataTypes.DATE, allowNull: false },
  created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: 'marketing_lead_saneamento_log',
  underscored: true,
  timestamps: false,
  indexes: [
    { fields: ['lead_id'], name: 'idx_marketing_lead_saneamento_log_lead_id' },
  ],
});

export = MarketingLeadSaneamentoLog;
