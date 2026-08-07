/**
 * 🧭 Model: FacilityVehicleTrip (Diário de Uso — Facilities)
 *
 * @module models/FacilityVehicleTrip
 *
 * Tabela `facility_vehicle_trips` (migration `20260807-000293`). Máquina
 * de estados de saída/retorno de veículo (`scheduled → out → returned`,
 * ou `canceled`), com rastreabilidade de condutor e integridade de
 * odômetro (RF-FAC-016 a 021, RNF-FAC-01). O banco garante
 * `return_km >= departure_km` e no máximo 1 uso `status='out'` por
 * veículo/condutor (índices únicos parciais) — a aplicação garante o
 * restante (departure_km >= maior return_km conhecido, elegibilidade de
 * condutor/veículo).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type FacilityTripPurpose = 'delivery' | 'executive' | 'errand' | 'other';
type FacilityTripStatus = 'scheduled' | 'out' | 'returned' | 'canceled';

interface FacilityVehicleTripAttributes {
  id: number;
  asset_id: number;
  driver_id: number;
  requested_by: number | null;
  purpose: FacilityTripPurpose;
  destination: string | null;
  departure_at: Date | null;
  departure_km: number | null;
  return_at: Date | null;
  return_km: number | null;
  fuel_level_out: number | null;
  fuel_level_in: number | null;
  incidents: string | null;
  odometer_override_reason: string | null;
  odometer_override_approved_by: number | null;
  odometer_override_approved_at: Date | null;
  status: FacilityTripStatus;
  cancel_reason: string | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const FacilityVehicleTrip = sequelize.define<any, FacilityVehicleTripAttributes>('FacilityVehicleTrip', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  asset_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK → assets.id' },
  driver_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK → facility_drivers.id' },
  requested_by: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK → users.id' },
  purpose: { type: DataTypes.ENUM('delivery', 'executive', 'errand', 'other'), allowNull: false },
  destination: { type: DataTypes.STRING(200), allowNull: true },
  departure_at: { type: DataTypes.DATE, allowNull: true },
  departure_km: { type: DataTypes.INTEGER, allowNull: true },
  return_at: { type: DataTypes.DATE, allowNull: true },
  return_km: { type: DataTypes.INTEGER, allowNull: true },
  fuel_level_out: { type: DataTypes.SMALLINT, allowNull: true },
  fuel_level_in: { type: DataTypes.SMALLINT, allowNull: true },
  incidents: { type: DataTypes.TEXT, allowNull: true },
  odometer_override_reason: { type: DataTypes.TEXT, allowNull: true },
  odometer_override_approved_by: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK → users.id' },
  odometer_override_approved_at: { type: DataTypes.DATE, allowNull: true },
  status: { type: DataTypes.ENUM('scheduled', 'out', 'returned', 'canceled'), allowNull: false, defaultValue: 'scheduled' },
  cancel_reason: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'facility_vehicle_trips',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['asset_id'], name: 'idx_facility_vehicle_trips_asset_id' },
    { fields: ['driver_id'], name: 'idx_facility_vehicle_trips_driver_id' },
    { fields: ['status'], name: 'idx_facility_vehicle_trips_status' },
  ],
});

export = FacilityVehicleTrip;
