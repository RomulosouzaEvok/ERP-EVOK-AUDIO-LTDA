/**
 * 🚚 Model: FacilityVehicle (Veículo de Frota — Facilities)
 *
 * @module models/FacilityVehicle
 *
 * Cadastro de veículo da frota administrativa/interna (entregas, transporte
 * executivo) do módulo Facilities (departamento 17, sigla FAC — ver
 * `docs/administrativo/03-FACILITIES.md`). Nome `facility_vehicles` (não
 * `fleet_vehicles`, nome usado no spec original) para deixar explícito o
 * módulo dono e evitar colisão com um futuro cadastro de frota de
 * logística/expedição (ver nota de decisão na migration
 * `20260807-000200-create-facilities-module.cjs`).
 *
 * Diferente de `Asset` (Patrimônio), que trata o veículo como ativo
 * depreciável/QR Code, este model é focado em operação de frota
 * (abastecimento, seguro, manutenção preventiva por km).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type FacilityVehicleFuelType = 'gasoline' | 'ethanol' | 'diesel' | 'flex' | 'electric';
type FacilityVehicleStatus = 'active' | 'maintenance' | 'deactivated' | 'sold';

interface FacilityVehicleAttributes {
  id: number;
  plate: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  fuel_type: FacilityVehicleFuelType | null;
  renavam: string | null;
  chassi: string | null;
  insurance_company: string | null;
  insurance_policy: string | null;
  insurance_expiry: string | null;
  last_oil_change: string | null;
  next_oil_change_km: number | null;
  current_km: number;
  status: FacilityVehicleStatus;
  notes: string | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const FacilityVehicle = sequelize.define('FacilityVehicle', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  plate: { type: DataTypes.STRING(10), allowNull: false, unique: true, comment: 'Placa unica do veiculo' },
  brand: { type: DataTypes.STRING(50), allowNull: true },
  model: { type: DataTypes.STRING(50), allowNull: true },
  year: { type: DataTypes.INTEGER, allowNull: true },
  color: { type: DataTypes.STRING(30), allowNull: true },
  fuel_type: { type: DataTypes.ENUM('gasoline', 'ethanol', 'diesel', 'flex', 'electric'), allowNull: true },
  renavam: { type: DataTypes.STRING(30), allowNull: true },
  chassi: { type: DataTypes.STRING(50), allowNull: true },
  insurance_company: { type: DataTypes.STRING(100), allowNull: true },
  insurance_policy: { type: DataTypes.STRING(50), allowNull: true },
  insurance_expiry: { type: DataTypes.DATEONLY, allowNull: true },
  last_oil_change: { type: DataTypes.DATEONLY, allowNull: true },
  next_oil_change_km: { type: DataTypes.INTEGER, allowNull: true },
  current_km: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  status: { type: DataTypes.ENUM('active', 'maintenance', 'deactivated', 'sold'), allowNull: false, defaultValue: 'active' },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'facility_vehicles',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['plate'], unique: true, name: 'uq_facility_vehicles_plate' },
    { fields: ['status'], name: 'idx_facility_vehicles_status' },
  ],
});

export = FacilityVehicle;
