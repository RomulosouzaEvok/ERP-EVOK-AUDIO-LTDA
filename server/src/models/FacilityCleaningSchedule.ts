/**
 * 🧹 Model: FacilityCleaningSchedule (Plano de Limpeza — Facilities)
 *
 * @module models/FacilityCleaningSchedule
 *
 * Plano recorrente de limpeza por área. Desde o BLOCO 4 FAC (correção,
 * migration `20260807-000297`), ganhou `facility_area_id` (FK opcional,
 * quando a área existe no cadastro formal de `FacilityArea`),
 * `responsible_employee_id` (FK opcional) e `active`. `area` (texto livre)
 * e `responsible_person` (texto livre) são mantidos como fallback
 * consciente para áreas/responsáveis informais — coexistência, não
 * reversão: preencher a FK quando possível, texto livre sempre
 * preenchido. Execuções vivem em `FacilityCleaningExecution` (RF-FAC-050).
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
  facility_area_id: number | null;
  responsible_employee_id: number | null;
  active: boolean;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const FacilityCleaningSchedule = sequelize.define<any, FacilityCleaningScheduleAttributes>('FacilityCleaningSchedule', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  area: { type: DataTypes.STRING(100), allowNull: false, comment: 'Nome/descricao livre da area limpa (fallback, sempre preenchido)' },
  frequency: { type: DataTypes.ENUM('daily', 'alternate', 'weekly', 'biweekly', 'monthly'), allowNull: false },
  responsible_person: { type: DataTypes.STRING(100), allowNull: true },
  last_cleaning: { type: DataTypes.DATEONLY, allowNull: true },
  next_cleaning: { type: DataTypes.DATEONLY, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
  facility_area_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK → facility_areas.id (quando a área existe no cadastro formal)' },
  responsible_employee_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK → employees.id' },
  active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, {
  tableName: 'facility_cleaning_schedules',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['next_cleaning'], name: 'idx_facility_cleaning_schedules_next_cleaning' },
    { fields: ['facility_area_id'], name: 'idx_facility_cleaning_schedules_facility_area_id' },
  ],
});

export = FacilityCleaningSchedule;
