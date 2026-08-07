/**
 * ⚖️ Model: JurProxy (Procuração)
 *
 * @module models/JurProxy
 *
 * Tabela `jur_proxies` (migration `20260807-000269`, UC-55, RF-JUR-026 a
 * 029). Model criado nesta passada (P0) para completar o mapeamento
 * Sequelize das 16 tabelas do bloco; endpoints do Grupo 4 (Procurações)
 * ficam para a passada 2 — ver `docs/governance/HANDOFF_CODEX.md`.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type ProxyForm = 'public' | 'private';
type ProxyStatus = 'active' | 'revoked' | 'expired';

interface JurProxyAttributes {
  id: number;
  grantor_name: string;
  grantee_name: string;
  grantee_document: string | null;
  employee_id: number | null;
  external_lawyer_id: number | null;
  powers_description: string;
  power_tags: string | null;
  proxy_form: ProxyForm;
  issue_date: string;
  expiration_date: string | null;
  alert_advance_days: number;
  status: ProxyStatus;
  revoked_at: Date | null;
  revocation_communication: string | null;
  superseded_proxy_id: number | null;
  created_by: number;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const JurProxy = sequelize.define<any, JurProxyAttributes>('JurProxy', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  grantor_name: { type: DataTypes.STRING(200), allowNull: false, defaultValue: 'EVOK ÁUDIO LTDA' },
  grantee_name: { type: DataTypes.STRING(200), allowNull: false },
  grantee_document: { type: DataTypes.STRING(20), allowNull: true },
  employee_id: { type: DataTypes.INTEGER, allowNull: true },
  external_lawyer_id: { type: DataTypes.INTEGER, allowNull: true },
  powers_description: { type: DataTypes.TEXT, allowNull: false },
  power_tags: { type: DataTypes.STRING(255), allowNull: true },
  proxy_form: { type: DataTypes.ENUM('public', 'private'), allowNull: false },
  issue_date: { type: DataTypes.DATEONLY, allowNull: false },
  expiration_date: { type: DataTypes.DATEONLY, allowNull: true },
  alert_advance_days: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 30 },
  status: { type: DataTypes.ENUM('active', 'revoked', 'expired'), allowNull: false, defaultValue: 'active' },
  revoked_at: { type: DataTypes.DATE, allowNull: true },
  revocation_communication: { type: DataTypes.TEXT, allowNull: true },
  superseded_proxy_id: { type: DataTypes.INTEGER, allowNull: true },
  created_by: { type: DataTypes.INTEGER, allowNull: false },
}, {
  tableName: 'jur_proxies',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['status'] },
    { fields: ['expiration_date'] },
    { fields: ['employee_id'] },
    { fields: ['external_lawyer_id'] },
  ],
});

export = JurProxy;
