/**
 * ⛽ Model: FacilityFuelRecord (Registro de Abastecimento — Facilities)
 *
 * @module models/FacilityFuelRecord
 *
 * Histórico de abastecimento de um veículo da frota. Desde o BLOCO 4 FAC
 * (correção, migration `20260807-000290`), `vehicle_id` (→
 * `facility_vehicles.id`, tabela dropada) foi substituído por `asset_id`
 * (→ `assets.id`, decisão D-2). `driver_id` continua referenciando
 * `employees.id` diretamente (coluna não tocada por este bloco — o
 * condutor formal via `facility_drivers` é resolvido separadamente em
 * `FacilityVehicleTrip`, quando o abastecimento está vinculado a um uso
 * via `trip_id`). `full_tank`/`invoice_ref`/`trip_id` adicionados na
 * migration `20260807-000294`.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface FacilityFuelRecordAttributes {
  id: number;
  asset_id: number;
  record_date: Date;
  km_at_refuel: number | null;
  liters: number;
  price_per_liter: number;
  total_cost: number;
  fuel_station: string | null;
  driver_id: number | null;
  full_tank: boolean;
  invoice_ref: string | null;
  trip_id: number | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const FacilityFuelRecord = sequelize.define<any, FacilityFuelRecordAttributes>('FacilityFuelRecord', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  asset_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'assets', key: 'id' },
  },
  record_date: { type: DataTypes.DATE, allowNull: false, comment: 'Data/hora do abastecimento' },
  km_at_refuel: { type: DataTypes.INTEGER, allowNull: true },
  liters: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  price_per_liter: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  total_cost: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  fuel_station: { type: DataTypes.STRING(100), allowNull: true },
  driver_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'employees', key: 'id' },
  },
  full_tank: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  invoice_ref: { type: DataTypes.STRING(100), allowNull: true },
  trip_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK → facility_vehicle_trips.id' },
}, {
  tableName: 'facility_fuel_records',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['asset_id'], name: 'idx_facility_fuel_records_asset_id' },
    { fields: ['driver_id'], name: 'idx_facility_fuel_records_driver_id' },
    { fields: ['record_date'], name: 'idx_facility_fuel_records_record_date' },
    { fields: ['trip_id'], name: 'idx_facility_fuel_records_trip_id' },
  ],
});

export = FacilityFuelRecord;
