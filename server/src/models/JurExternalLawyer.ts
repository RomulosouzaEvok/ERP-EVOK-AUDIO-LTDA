/**
 * ⚖️ Model: JurExternalLawyer (Advogado Externo)
 *
 * @module models/JurExternalLawyer
 *
 * Tabela `jur_external_lawyers` (migration `20260807-000262`, RF-JUR-013).
 * Vínculo 1:1 opcional a `suppliers.id` (`supplier_id` UNIQUE) para
 * faturamento de honorários via Contas a Pagar — um advogado avulso pode
 * existir sem nunca virar `Supplier`.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface JurExternalLawyerAttributes {
  id: number;
  full_name: string;
  oab_number: string;
  law_firm: string | null;
  document: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  specialty: string | null;
  fee_terms: string | null;
  supplier_id: number | null;
  active: boolean;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const JurExternalLawyer = sequelize.define<any, JurExternalLawyerAttributes>('JurExternalLawyer', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  full_name: { type: DataTypes.STRING(150), allowNull: false },
  oab_number: { type: DataTypes.STRING(30), allowNull: false },
  law_firm: { type: DataTypes.STRING(150), allowNull: true },
  document: { type: DataTypes.STRING(20), allowNull: true },
  contact_email: { type: DataTypes.STRING(150), allowNull: true },
  contact_phone: { type: DataTypes.STRING(30), allowNull: true },
  specialty: { type: DataTypes.STRING(150), allowNull: true },
  fee_terms: { type: DataTypes.TEXT, allowNull: true },
  supplier_id: { type: DataTypes.INTEGER, allowNull: true, unique: true },
  active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, {
  tableName: 'jur_external_lawyers',
  underscored: true,
  timestamps: true,
  indexes: [{ fields: ['active'] }, { fields: ['oab_number'] }],
});

export = JurExternalLawyer;
