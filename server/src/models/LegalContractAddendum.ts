/**
 * 📎 Model: LegalContractAddendum (Aditivo Contratual — Jurídico)
 *
 * @module models/LegalContractAddendum
 *
 * Aditivo de um {@link LegalContract} (mudança de prazo, valor, cláusula,
 * parte ou outro), módulo Jurídico (departamento 16, sigla JUR — ver
 * `docs/juridico/01-CONTRATOS.md`). `file_path` segue o mesmo padrão de
 * armazenamento local em `uploads/` usado pelo restante do projeto.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type LegalContractAddendumChangeType = 'term' | 'value' | 'clause' | 'party' | 'other';

interface LegalContractAddendumAttributes {
  id: number;
  contract_id: number;
  addendum_number: number;
  description: string | null;
  change_type: LegalContractAddendumChangeType;
  new_end_date: string | null;
  new_value: number | null;
  file_path: string | null;
  signed_date: string | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const LegalContractAddendum = sequelize.define('LegalContractAddendum', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  contract_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'legal_contracts', key: 'id' },
  },
  addendum_number: { type: DataTypes.INTEGER, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  change_type: {
    type: DataTypes.ENUM('term', 'value', 'clause', 'party', 'other'),
    allowNull: false,
  },
  new_end_date: { type: DataTypes.DATEONLY, allowNull: true },
  new_value: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
  file_path: { type: DataTypes.STRING(255), allowNull: true },
  signed_date: { type: DataTypes.DATEONLY, allowNull: true },
}, {
  tableName: 'legal_contract_addendums',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['contract_id'], name: 'idx_legal_contract_addendums_contract_id' },
  ],
});

export = LegalContractAddendum;
