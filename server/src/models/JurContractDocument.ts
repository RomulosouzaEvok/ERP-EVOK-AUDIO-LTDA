/**
 * ⚖️ Model: JurContractDocument (minuta versionada de um Contrato)
 *
 * @module models/JurContractDocument
 *
 * Tabela `jur_contract_documents` (migration `20260807-000261`). Sequência
 * `v1, v2...` por `contract_id`, calculada pela aplicação — nunca informada
 * pelo cliente (RF-JUR-002). `is_signed_version: true` é pré-requisito de
 * `POST /api/jur/contracts/:id/activate` (RF-JUR-004).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface JurContractDocumentAttributes {
  id: number;
  contract_id: number;
  version_number: number;
  file_url: string;
  author_id: number;
  uploaded_at: Date;
  observations: string | null;
  is_signed_version: boolean;
  readonly createdAt?: Date;
}

const JurContractDocument = sequelize.define<any, JurContractDocumentAttributes>('JurContractDocument', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  contract_id: { type: DataTypes.INTEGER, allowNull: false },
  version_number: { type: DataTypes.INTEGER, allowNull: false },
  file_url: { type: DataTypes.STRING(255), allowNull: false },
  author_id: { type: DataTypes.INTEGER, allowNull: false },
  uploaded_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  observations: { type: DataTypes.TEXT, allowNull: true },
  is_signed_version: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, {
  tableName: 'jur_contract_documents',
  underscored: true,
  timestamps: true,
  updatedAt: false,
  indexes: [{ fields: ['contract_id'] }],
});

export = JurContractDocument;
