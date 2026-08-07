/**
 * 🚨 Model: FacilityFine (Multa de Trânsito — Facilities)
 *
 * @module models/FacilityFine
 *
 * Tabela `facility_fines` (migration `20260807-000295`). Maior exposição
 * legal do bloco (CTB Art. 257 §7º — prazo de indicação de condutor).
 * Nunca excluída fisicamente (RF-FAC-035/059).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type FacilityFineIndicationStatus = 'pending' | 'indicated' | 'expired_nic' | 'not_applicable';
type FacilityFineStatus = 'open' | 'paid' | 'appealed' | 'canceled';

interface FacilityFineAttributes {
  id: number;
  asset_id: number;
  infraction_at: Date;
  location: string | null;
  infraction_code: string | null;
  description: string | null;
  amount: number;
  points: number | null;
  notice_received_at: string | null;
  indication_deadline: string | null;
  identified_driver_id: number | null;
  indicated_at: string | null;
  indication_status: FacilityFineIndicationStatus;
  charge_to_driver: boolean;
  financial_ref: string | null;
  accounts_payable_id: number | null;
  status: FacilityFineStatus;
  notes: string | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const FacilityFine = sequelize.define<any, FacilityFineAttributes>('FacilityFine', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  asset_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK → assets.id' },
  infraction_at: { type: DataTypes.DATE, allowNull: false },
  location: { type: DataTypes.STRING(200), allowNull: true },
  infraction_code: { type: DataTypes.STRING(20), allowNull: true },
  description: { type: DataTypes.TEXT, allowNull: true },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  points: { type: DataTypes.SMALLINT, allowNull: true },
  notice_received_at: { type: DataTypes.DATEONLY, allowNull: true },
  indication_deadline: { type: DataTypes.DATEONLY, allowNull: true },
  identified_driver_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK → facility_drivers.id' },
  indicated_at: { type: DataTypes.DATEONLY, allowNull: true },
  indication_status: { type: DataTypes.ENUM('pending', 'indicated', 'expired_nic', 'not_applicable'), allowNull: false, defaultValue: 'pending' },
  charge_to_driver: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  financial_ref: { type: DataTypes.STRING(150), allowNull: true },
  accounts_payable_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK → accounts_payable.id' },
  status: { type: DataTypes.ENUM('open', 'paid', 'appealed', 'canceled'), allowNull: false, defaultValue: 'open' },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'facility_fines',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['asset_id'], name: 'idx_facility_fines_asset_id' },
    { fields: ['indication_deadline'], name: 'idx_facility_fines_indication_deadline' },
    { fields: ['identified_driver_id'], name: 'idx_facility_fines_identified_driver_id' },
    { fields: ['status'], name: 'idx_facility_fines_status' },
    { fields: ['indication_status'], name: 'idx_facility_fines_indication_status' },
  ],
});

export = FacilityFine;
