/**
 * ⚖️ Model: JurLegalAlert (entidade única de alerta do módulo Jurídico)
 *
 * @module models/JurLegalAlert
 *
 * Tabela `jur_legal_alerts` (migration `20260807-000267`). Cobre
 * RF-JUR-005/006/022/027/032/038 (vencimento de contrato, denúncia,
 * D-7/D-3/D-1/D0 de prazo fatal, vencimento de procuração,
 * renovação/anuidade de PI, D-5/D-1 de solicitação LGPD).
 * `origin_type`+`origin_id` é polimórfico, SEM FK real (mesma exceção já
 * aceita para `sst_acoes_corretivas`). RNF-JUR-04: esta tabela
 * deliberadamente NÃO tem coluna `disabled`/`muted`/`active` — não há
 * campo para desativar um alerta de prazo fatal, nem por `role='admin'`.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type AlertOriginType = 'contract' | 'proxy' | 'intellectual_property' | 'lgpd_request' | 'legal_case_deadline';
type AlertStatus = 'pending' | 'acknowledged' | 'escalated' | 'resolved';

interface JurLegalAlertAttributes {
  id: number;
  origin_type: AlertOriginType;
  origin_id: number;
  alert_subtype: string;
  due_date: string;
  recipient_user_id: number;
  status: AlertStatus;
  acknowledged_at: Date | null;
  escalated_to_user_id: number | null;
  escalated_at: Date | null;
  resolved_at: Date | null;
  readonly createdAt?: Date;
}

const JurLegalAlert = sequelize.define<any, JurLegalAlertAttributes>('JurLegalAlert', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  origin_type: { type: DataTypes.ENUM('contract', 'proxy', 'intellectual_property', 'lgpd_request', 'legal_case_deadline'), allowNull: false },
  origin_id: { type: DataTypes.INTEGER, allowNull: false },
  alert_subtype: { type: DataTypes.STRING(40), allowNull: false },
  due_date: { type: DataTypes.DATEONLY, allowNull: false },
  recipient_user_id: { type: DataTypes.INTEGER, allowNull: false },
  status: { type: DataTypes.ENUM('pending', 'acknowledged', 'escalated', 'resolved'), allowNull: false, defaultValue: 'pending' },
  acknowledged_at: { type: DataTypes.DATE, allowNull: true },
  escalated_to_user_id: { type: DataTypes.INTEGER, allowNull: true },
  escalated_at: { type: DataTypes.DATE, allowNull: true },
  resolved_at: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'jur_legal_alerts',
  underscored: true,
  timestamps: true,
  updatedAt: false,
  indexes: [
    { fields: ['origin_type', 'origin_id'] },
    { fields: ['recipient_user_id', 'status'] },
    { fields: ['due_date'] },
  ],
});

export = JurLegalAlert;
