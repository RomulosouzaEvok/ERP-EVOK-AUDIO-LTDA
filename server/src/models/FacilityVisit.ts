/**
 * 🛂 Model: FacilityVisit (Check-in/Check-out de Visitante — Facilities)
 *
 * @module models/FacilityVisit
 *
 * Tabela `facility_visits` (migration `20260807-000298`). RF-FAC-044/045.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type FacilityVisitStatus = 'scheduled' | 'onsite' | 'completed' | 'no_show' | 'canceled';

interface FacilityVisitAttributes {
  id: number;
  visitor_id: number;
  host_employee_id: number;
  scheduled_at: Date | null;
  checkin_at: Date | null;
  checkout_at: Date | null;
  badge_number: string | null;
  purpose: string | null;
  areas_authorized: string | null;
  status: FacilityVisitStatus;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const FacilityVisit = sequelize.define<any, FacilityVisitAttributes>('FacilityVisit', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  visitor_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK → facility_visitors.id' },
  host_employee_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK → employees.id' },
  scheduled_at: { type: DataTypes.DATE, allowNull: true },
  checkin_at: { type: DataTypes.DATE, allowNull: true },
  checkout_at: { type: DataTypes.DATE, allowNull: true },
  badge_number: { type: DataTypes.STRING(20), allowNull: true },
  purpose: { type: DataTypes.STRING(200), allowNull: true },
  areas_authorized: { type: DataTypes.TEXT, allowNull: true },
  status: { type: DataTypes.ENUM('scheduled', 'onsite', 'completed', 'no_show', 'canceled'), allowNull: false, defaultValue: 'scheduled' },
}, {
  tableName: 'facility_visits',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['visitor_id'], name: 'idx_facility_visits_visitor_id' },
    { fields: ['host_employee_id'], name: 'idx_facility_visits_host_employee_id' },
    { fields: ['status'], name: 'idx_facility_visits_status' },
    { fields: ['checkin_at'], name: 'idx_facility_visits_checkin_at' },
  ],
});

export = FacilityVisit;
