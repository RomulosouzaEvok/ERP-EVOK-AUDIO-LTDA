/**
 * ⚖️ Model: JurIntellectualProperty (Ativo de Propriedade Intelectual)
 *
 * @module models/JurIntellectualProperty
 *
 * Tabela `jur_intellectual_property` (migration `20260807-000270`,
 * RF-JUR-031 a 033). Model criado nesta passada (P0) para completar o
 * mapeamento Sequelize das 16 tabelas do bloco; endpoints do Grupo 5 (PI)
 * ficam para a passada 2. `trade_secret` NUNCA armazena o conteúdo do
 * segredo — garantido por ausência estrutural de coluna de conteúdo.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type IpType = 'trademark' | 'patent' | 'utility_model' | 'industrial_design' | 'copyright' | 'trade_secret';
type IpStatus = 'filed' | 'granted' | 'active' | 'expired' | 'abandoned';

interface JurIntellectualPropertyAttributes {
  id: number;
  ip_type: IpType;
  registration_number: string | null;
  title: string;
  description: string | null;
  holding_area: string | null;
  filing_date: string | null;
  grant_date: string | null;
  expiration_date: string | null;
  next_annuity_date: string | null;
  status: IpStatus;
  responsible_user_id: number;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const JurIntellectualProperty = sequelize.define<any, JurIntellectualPropertyAttributes>('JurIntellectualProperty', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  ip_type: { type: DataTypes.ENUM('trademark', 'patent', 'utility_model', 'industrial_design', 'copyright', 'trade_secret'), allowNull: false },
  registration_number: { type: DataTypes.STRING(50), allowNull: true },
  title: { type: DataTypes.STRING(200), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  holding_area: { type: DataTypes.STRING(150), allowNull: true },
  filing_date: { type: DataTypes.DATEONLY, allowNull: true },
  grant_date: { type: DataTypes.DATEONLY, allowNull: true },
  expiration_date: { type: DataTypes.DATEONLY, allowNull: true },
  next_annuity_date: { type: DataTypes.DATEONLY, allowNull: true },
  status: { type: DataTypes.ENUM('filed', 'granted', 'active', 'expired', 'abandoned'), allowNull: false, defaultValue: 'filed' },
  responsible_user_id: { type: DataTypes.INTEGER, allowNull: false },
}, {
  tableName: 'jur_intellectual_property',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['ip_type'] },
    { fields: ['status'] },
    { fields: ['next_annuity_date'] },
    { fields: ['expiration_date'] },
  ],
});

export = JurIntellectualProperty;
