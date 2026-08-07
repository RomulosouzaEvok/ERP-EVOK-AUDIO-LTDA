/**
 * 💻 Model: ItSoftwareLicenseDetail (Extensão de Licença de Software)
 *
 * @module models/ItSoftwareLicenseDetail
 *
 * Tabela `it_software_license_details` (migration `20260807-000153`).
 * Extensão 1:1 de `assets` (`asset_type='license'`, validado em app —
 * BR-TI-008). `license_key` trafega em texto simples; mascaramento e
 * controle de exibição são 100% de aplicação (BR-TI-014/RNF-TI-01).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type LicenseType = 'perpetual' | 'subscription' | 'free';
type BillingCycle = 'one_time' | 'monthly' | 'yearly';

interface ItSoftwareLicenseDetailAttributes {
  id: number;
  asset_id: number;
  license_type: LicenseType;
  vendor: string | null;
  seats: number;
  license_key: string | null;
  cost: number | null;
  billing_cycle: BillingCycle;
  renewal_date: string | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const ItSoftwareLicenseDetail = sequelize.define<any, ItSoftwareLicenseDetailAttributes>('ItSoftwareLicenseDetail', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  asset_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  license_type: { type: DataTypes.ENUM('perpetual', 'subscription', 'free'), allowNull: false },
  vendor: DataTypes.STRING(150),
  seats: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  license_key: DataTypes.STRING(500),
  cost: DataTypes.DECIMAL(18, 6),
  billing_cycle: { type: DataTypes.ENUM('one_time', 'monthly', 'yearly'), allowNull: false, defaultValue: 'one_time' },
  renewal_date: DataTypes.DATEONLY,
}, {
  tableName: 'it_software_license_details',
  underscored: true,
  timestamps: true,
});

export = ItSoftwareLicenseDetail;
