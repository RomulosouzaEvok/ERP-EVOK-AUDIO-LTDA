/**
 * 🏢 Model: FacilityArea (Área Física — Facilities)
 *
 * @module models/FacilityArea
 *
 * Cadastro de área física da fábrica/escritório (m², capacidade de
 * pessoas), opcionalmente vinculada a um `Department` (RH). Independente
 * de `Department`: uma área física pode não corresponder a nenhum
 * departamento (ex. áreas comuns/externas) — FK nullable.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type FacilityAreaType = 'production' | 'warehouse' | 'office' | 'lab' | 'amenities' | 'external';

interface FacilityAreaAttributes {
  id: number;
  name: string;
  area_type: FacilityAreaType;
  square_meters: number | null;
  department_id: number | null;
  capacity_persons: number | null;
  notes: string | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const FacilityArea = sequelize.define('FacilityArea', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  area_type: { type: DataTypes.ENUM('production', 'warehouse', 'office', 'lab', 'amenities', 'external'), allowNull: false },
  square_meters: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  department_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'departments', key: 'id' },
  },
  capacity_persons: { type: DataTypes.INTEGER, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'facility_areas',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['department_id'], name: 'idx_facility_areas_department_id' },
    { fields: ['area_type'], name: 'idx_facility_areas_area_type' },
  ],
});

export = FacilityArea;
