/**
 * ⚖️ Model: JurContractAddendum (aditivo — histórico imutável)
 *
 * @module models/JurContractAddendum
 *
 * Tabela `jur_contract_addendums` (migration `20260807-000261`, RF-JUR-008).
 * **Append-only**: trigger `trg_jur_lock_contract_addendum` bloqueia
 * UPDATE/DELETE desde o INSERT. `previous_end_date`/`previous_value` são
 * snapshots gravados no momento da criação — correção de aditivo já criado
 * é sempre um NOVO aditivo, nunca edição do existente.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type AddendumType = 'term' | 'value' | 'clause' | 'party' | 'other';

interface JurContractAddendumAttributes {
  id: number;
  contract_id: number;
  addendum_number: number;
  addendum_type: AddendumType;
  description: string;
  previous_end_date: string | null;
  new_end_date: string | null;
  previous_value: string | null;
  new_value: string | null;
  document_url: string | null;
  signed_at: string | null;
  created_by: number;
  readonly createdAt?: Date;
}

const JurContractAddendum = sequelize.define<any, JurContractAddendumAttributes>('JurContractAddendum', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  contract_id: { type: DataTypes.INTEGER, allowNull: false },
  addendum_number: { type: DataTypes.INTEGER, allowNull: false },
  addendum_type: { type: DataTypes.ENUM('term', 'value', 'clause', 'party', 'other'), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },
  previous_end_date: { type: DataTypes.DATEONLY, allowNull: true },
  new_end_date: { type: DataTypes.DATEONLY, allowNull: true },
  previous_value: { type: DataTypes.DECIMAL(18, 6), allowNull: true },
  new_value: { type: DataTypes.DECIMAL(18, 6), allowNull: true },
  document_url: { type: DataTypes.STRING(255), allowNull: true },
  signed_at: { type: DataTypes.DATEONLY, allowNull: true },
  created_by: { type: DataTypes.INTEGER, allowNull: false },
}, {
  tableName: 'jur_contract_addendums',
  underscored: true,
  timestamps: true,
  updatedAt: false,
  indexes: [{ fields: ['contract_id'] }],
});

export = JurContractAddendum;
