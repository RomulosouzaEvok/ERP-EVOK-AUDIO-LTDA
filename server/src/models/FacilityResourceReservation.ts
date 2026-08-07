/**
 * 📅 Model: FacilityResourceReservation (Reserva de Sala/Equipamento — Facilities)
 *
 * @module models/FacilityResourceReservation
 *
 * Tabela `facility_resource_reservations` (migration `20260807-000300`,
 * P2). Reserva de sala (`facility_area_id`) ou equipamento (`asset_id`) —
 * exatamente um dos dois, conforme `resource_type` (CHECK no banco).
 * Não sobreposição de intervalo (RF-FAC-055) é garantida por `EXCLUDE
 * USING gist` no banco — o use case ainda valida no caminho feliz para dar
 * mensagem de erro amigável (409) antes de deixar o Postgres rejeitar.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type FacilityReservationResourceType = 'room' | 'equipment';
type FacilityReservationStatus = 'confirmed' | 'canceled' | 'completed';

interface FacilityResourceReservationAttributes {
  id: number;
  resource_type: FacilityReservationResourceType;
  facility_area_id: number | null;
  asset_id: number | null;
  reserved_by: number;
  starts_at: Date;
  ends_at: Date;
  subject: string | null;
  status: FacilityReservationStatus;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const FacilityResourceReservation = sequelize.define<any, FacilityResourceReservationAttributes>('FacilityResourceReservation', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  resource_type: { type: DataTypes.ENUM('room', 'equipment'), allowNull: false },
  facility_area_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK → facility_areas.id' },
  asset_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK → assets.id' },
  reserved_by: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK → employees.id' },
  starts_at: { type: DataTypes.DATE, allowNull: false },
  ends_at: { type: DataTypes.DATE, allowNull: false },
  subject: { type: DataTypes.STRING(200), allowNull: true },
  status: { type: DataTypes.ENUM('confirmed', 'canceled', 'completed'), allowNull: false, defaultValue: 'confirmed' },
}, {
  tableName: 'facility_resource_reservations',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['facility_area_id'], name: 'idx_facility_resource_reservations_facility_area_id' },
    { fields: ['asset_id'], name: 'idx_facility_resource_reservations_asset_id' },
    { fields: ['reserved_by'], name: 'idx_facility_resource_reservations_reserved_by' },
    { fields: ['status'], name: 'idx_facility_resource_reservations_status' },
  ],
});

export = FacilityResourceReservation;
