/**
 * 🚚 Model: FacilityVehicleDetail (Extensão de Veículo de Frota — Facilities)
 *
 * @module models/FacilityVehicleDetail
 *
 * Tabela `facility_vehicle_details` (migration `20260807-000290`, BLOCO 4
 * FAC — correção, decisão D-2). Extensão 1:1 de `assets`
 * (`asset_type='vehicle'`), substitui o antigo model `FacilityVehicle`
 * (tabela `facility_vehicles`, dropada nesta mesma migration), mesmo
 * padrão já usado por `ItSoftwareLicenseDetail` (`asset_type='license'`).
 *
 * Marca, modelo, status, valor de aquisição/depreciação, responsável,
 * departamento, QR code e `location` NÃO são duplicados aqui — vivem em
 * `Asset` e são obtidos por join (RF-FAC-003). `current_km` só é gravável
 * por dois caminhos de aplicação: retorno de uso (`FacilityVehicleTrip`) e
 * abastecimento validado (`FacilityFuelRecord`) — RNF-FAC-01.
 *
 * `last_oil_change`/`next_oil_change_km`/`insurance_company`/
 * `insurance_policy`/`insurance_expiry`: colunas "legado", preservadas do
 * antigo `facility_vehicles` (RNF-FAC-03 — nenhum dado perdido); o
 * desenho-alvo generaliza seguro em `FacilityVehicleDocument` e
 * óleo/preventiva em `MaintenanceOrder.next_maintenance_km`.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type FacilityVehicleFuelType = 'gasoline' | 'ethanol' | 'diesel' | 'flex' | 'electric';

interface FacilityVehicleDetailAttributes {
  id: number;
  asset_id: number;
  plate: string;
  renavam: string | null;
  chassi: string | null;
  color: string | null;
  year: number | null;
  fuel_type: FacilityVehicleFuelType | null;
  current_km: number;
  tank_capacity_liters: number | null;
  required_cnh_category: string | null;
  last_oil_change: string | null;
  next_oil_change_km: number | null;
  insurance_company: string | null;
  insurance_policy: string | null;
  insurance_expiry: string | null;
  notes: string | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const FacilityVehicleDetail = sequelize.define<any, FacilityVehicleDetailAttributes>('FacilityVehicleDetail', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  asset_id: { type: DataTypes.INTEGER, allowNull: false, unique: true, comment: 'FK → assets.id (extensão 1:1, asset_type=vehicle)' },
  plate: { type: DataTypes.STRING(10), allowNull: false, unique: true, comment: 'Placa única do veículo' },
  renavam: { type: DataTypes.STRING(30), allowNull: true },
  chassi: { type: DataTypes.STRING(50), allowNull: true },
  color: { type: DataTypes.STRING(30), allowNull: true },
  year: { type: DataTypes.INTEGER, allowNull: true },
  fuel_type: { type: DataTypes.ENUM('gasoline', 'ethanol', 'diesel', 'flex', 'electric'), allowNull: true },
  current_km: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  tank_capacity_liters: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  required_cnh_category: { type: DataTypes.STRING(5), allowNull: true },
  last_oil_change: { type: DataTypes.DATEONLY, allowNull: true },
  next_oil_change_km: { type: DataTypes.INTEGER, allowNull: true },
  insurance_company: { type: DataTypes.STRING(100), allowNull: true },
  insurance_policy: { type: DataTypes.STRING(50), allowNull: true },
  insurance_expiry: { type: DataTypes.DATEONLY, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'facility_vehicle_details',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['fuel_type'], name: 'idx_facility_vehicle_details_fuel_type' },
  ],
});

export = FacilityVehicleDetail;
