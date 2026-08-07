/**
 * 🧠 Model: LegalIntellectualProperty (Propriedade Intelectual — Jurídico)
 *
 * @module models/LegalIntellectualProperty
 *
 * Registro de ativo de propriedade intelectual (marca, patente, desenho
 * industrial, direito autoral, segredo industrial), módulo Jurídico
 * (departamento 16, sigla JUR — ver
 * `docs/juridico/02-PROPRIEDADE_INTELECTUAL.md`). `owner` default
 * 'EVOK ÁUDIO LTDA' (titular da imensa maioria dos registros, mas o campo é
 * livre para cobrir eventual cotitularidade/cessão).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type LegalIntellectualPropertyType = 'trademark' | 'patent' | 'industrial_design' | 'copyright' | 'trade_secret';
type LegalIntellectualPropertyStatus = 'filed' | 'examined' | 'granted' | 'expired' | 'abandoned';

interface LegalIntellectualPropertyAttributes {
  id: number;
  ip_type: LegalIntellectualPropertyType;
  title: string;
  description: string | null;
  registration_number: string | null;
  filing_date: string | null;
  grant_date: string | null;
  expiration_date: string | null;
  owner: string;
  status: LegalIntellectualPropertyStatus;
  jurisdiction: string;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const LegalIntellectualProperty = sequelize.define('LegalIntellectualProperty', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  ip_type: {
    type: DataTypes.ENUM('trademark', 'patent', 'industrial_design', 'copyright', 'trade_secret'),
    allowNull: false,
  },
  title: { type: DataTypes.STRING(200), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  registration_number: { type: DataTypes.STRING(50), allowNull: true },
  filing_date: { type: DataTypes.DATEONLY, allowNull: true },
  grant_date: { type: DataTypes.DATEONLY, allowNull: true },
  expiration_date: { type: DataTypes.DATEONLY, allowNull: true },
  owner: { type: DataTypes.STRING(200), allowNull: false, defaultValue: 'EVOK ÁUDIO LTDA' },
  status: {
    type: DataTypes.ENUM('filed', 'examined', 'granted', 'expired', 'abandoned'),
    allowNull: false,
    defaultValue: 'filed',
  },
  jurisdiction: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'BR' },
}, {
  tableName: 'legal_intellectual_property',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['ip_type'], name: 'idx_legal_intellectual_property_ip_type' },
    { fields: ['status'], name: 'idx_legal_intellectual_property_status' },
    { fields: ['expiration_date'], name: 'idx_legal_intellectual_property_expiration_date' },
  ],
});

export = LegalIntellectualProperty;
