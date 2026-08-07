/**
 * 🧹 Model: FacilityCleaningSchedule (Programação de Limpeza — Facilities)
 *
 * @module models/FacilityCleaningSchedule
 *
 * Programação recorrente de limpeza por área (texto livre — ver nota de
 * decisão na migration `20260807-000200-create-facilities-module.cjs` sobre
 * por que `area` não é FK para `FacilityArea`).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type FacilityCleaningFrequency = 'daily' | 'alternate' | 'weekly' | 'biweekly' | 'monthly';

interface FacilityCleaningScheduleAttributes {
  id: number;
  area: string;
  frequency: FacilityCleaningFrequency;
  responsible_person: string | null;
  last_cleaning: string | null;
  next_cleaning: string | null;
  notes: string | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const FacilityCleaningSchedule = sequelize.define('FacilityCleaningSchedule', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  area: { type: DataTypes.STRING(100), allowNull: false, comment: 'Nome/descricao livre da area limpa' },
  frequency: { type: DataTypes.ENUM('daily', 'alternate', 'weekly', 'biweekly', 'monthly'), allowNull: false },
  responsible_person: { type: DataTypes.STRING(100), allowNull: true },
  last_cleaning: { type: DataTypes.DATEONLY, allowNull: true },
  next_cleaning: { type: DataTypes.DATEONLY, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'facility_cleaning_schedules',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['next_cleaning'], name: 'idx_facility_cleaning_schedules_next_cleaning' },
  ],
});

export = FacilityCleaningSchedule;
