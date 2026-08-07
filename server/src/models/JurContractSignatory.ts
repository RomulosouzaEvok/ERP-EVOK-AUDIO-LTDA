/**
 * ⚖️ Model: JurContractSignatory (parte/testemunha de um Contrato)
 *
 * @module models/JurContractSignatory
 *
 * Tabela `jur_contract_signatories` (migration `20260807-000261`). Mínimo
 * de 2 registros `signatory_role IN ('party_a','party_b')` é exigido em
 * aplicação (BR-JUR-004) antes da transição para `signed`/`active`.
 * Testemunhas (`witness`) são recomendadas, nunca bloqueantes (CPC art.
 * 784, III).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type SignatoryRole = 'party_a' | 'party_b' | 'witness';

interface JurContractSignatoryAttributes {
  id: number;
  contract_id: number;
  signatory_role: SignatoryRole;
  name: string;
  document: string | null;
  employee_id: number | null;
  signed_at: string | null;
  readonly createdAt?: Date;
}

const JurContractSignatory = sequelize.define<any, JurContractSignatoryAttributes>('JurContractSignatory', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  contract_id: { type: DataTypes.INTEGER, allowNull: false },
  signatory_role: { type: DataTypes.ENUM('party_a', 'party_b', 'witness'), allowNull: false },
  name: { type: DataTypes.STRING(200), allowNull: false },
  document: { type: DataTypes.STRING(20), allowNull: true },
  employee_id: { type: DataTypes.INTEGER, allowNull: true },
  signed_at: { type: DataTypes.DATEONLY, allowNull: true },
}, {
  tableName: 'jur_contract_signatories',
  underscored: true,
  timestamps: true,
  updatedAt: false,
  indexes: [{ fields: ['contract_id'] }],
});

export = JurContractSignatory;
