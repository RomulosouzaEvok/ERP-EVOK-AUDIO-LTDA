/**
 * ⚖️ Model: JurIpContractLink (vínculo N:N Ativo de PI × Contrato)
 *
 * @module models/JurIpContractLink
 *
 * Tabela `jur_ip_contract_links` (migration `20260807-000270`, RF-JUR-034).
 * Model criado nesta passada (P0); endpoints do Grupo 5 (PI) ficam para a
 * passada 2. UNIQUE par `(ip_id, contract_id)`.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface JurIpContractLinkAttributes {
  id: number;
  ip_id: number;
  contract_id: number;
  link_description: string | null;
  readonly createdAt?: Date;
}

const JurIpContractLink = sequelize.define<any, JurIpContractLinkAttributes>('JurIpContractLink', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  ip_id: { type: DataTypes.INTEGER, allowNull: false },
  contract_id: { type: DataTypes.INTEGER, allowNull: false },
  link_description: { type: DataTypes.STRING(200), allowNull: true },
}, {
  tableName: 'jur_ip_contract_links',
  underscored: true,
  timestamps: true,
  updatedAt: false,
  indexes: [{ fields: ['contract_id'] }],
});

export = JurIpContractLink;
