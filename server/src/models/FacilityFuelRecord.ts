/**
 * ⛽ Model: FacilityFuelRecord (Registro de Abastecimento — Facilities)
 *
 * @module models/FacilityFuelRecord
 *
 * Histórico de abastecimento de um veículo da frota (`FacilityVehicle`).
 * Coluna `record_date` (não `date`, nome usado no spec original) para
 * evitar nome ambíguo/reservado em alguns drivers SQL — ver migration
 * `20260807-000200-create-facilities-module.cjs`.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface FacilityFuelRecordAttributes {
  id: number;
  vehicle_id: number;
  record_date: Date;
  km_at_refuel: number | null;
  liters: number;
  price_per_liter: number;
  total_cost: number;
  fuel_station: string | null;
  driver_id: number | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const FacilityFuelRecord = sequelize.define('FacilityFuelRecord', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  vehicle_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'facility_vehicles', key: 'id' },
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
}, {
  tableName: 'facility_fuel_records',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['vehicle_id'], name: 'idx_facility_fuel_records_vehicle_id' },
    { fields: ['driver_id'], name: 'idx_facility_fuel_records_driver_id' },
    { fields: ['record_date'], name: 'idx_facility_fuel_records_record_date' },
  ],
});

export = FacilityFuelRecord;
