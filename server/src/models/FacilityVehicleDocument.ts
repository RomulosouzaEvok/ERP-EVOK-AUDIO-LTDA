/**
 * 📄 Model: FacilityVehicleDocument (Documento de Veículo com Vencimento)
 *
 * @module models/FacilityVehicleDocument
 *
 * Tabela `facility_vehicle_documents` (migration `20260807-000291`).
 * Generaliza vencimento de documento por veículo (CRLV/licenciamento,
 * seguro, IPVA, outro) — RF-FAC-007 a 010. `asset_id` aponta direto para
 * `assets.id` (não para `facility_vehicle_details.id`); a validação de que
 * o asset é `asset_type='vehicle'` é responsabilidade do use case.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type FacilityVehicleDocType = 'crlv_licenciamento' | 'seguro' | 'ipva' | 'outro';
type FacilityVehicleDocStatus = 'vigente' | 'vencido' | 'renovado';

interface FacilityVehicleDocumentAttributes {
  id: number;
  asset_id: number;
  doc_type: FacilityVehicleDocType;
  reference: string | null;
  issuer: string | null;
  valid_until: string | null;
  cost: number | null;
  file_path: string | null;
  status: FacilityVehicleDocStatus;
  released_by: number | null;
  released_at: Date | null;
  notes: string | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const FacilityVehicleDocument = sequelize.define<any, FacilityVehicleDocumentAttributes>('FacilityVehicleDocument', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  asset_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK → assets.id' },
  doc_type: { type: DataTypes.ENUM('crlv_licenciamento', 'seguro', 'ipva', 'outro'), allowNull: false },
  reference: { type: DataTypes.STRING(100), allowNull: true },
  issuer: { type: DataTypes.STRING(150), allowNull: true },
  valid_until: { type: DataTypes.DATEONLY, allowNull: true },
  cost: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  file_path: { type: DataTypes.STRING(500), allowNull: true },
  status: { type: DataTypes.ENUM('vigente', 'vencido', 'renovado'), allowNull: false, defaultValue: 'vigente' },
  released_by: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK → users.id — liberação de saída com doc vencido (RF-FAC-010)' },
  released_at: { type: DataTypes.DATE, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'facility_vehicle_documents',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['asset_id'], name: 'idx_facility_vehicle_documents_asset_id' },
    { fields: ['doc_type'], name: 'idx_facility_vehicle_documents_doc_type' },
    { fields: ['valid_until'], name: 'idx_facility_vehicle_documents_valid_until' },
    { fields: ['status'], name: 'idx_facility_vehicle_documents_status' },
  ],
});

export = FacilityVehicleDocument;
