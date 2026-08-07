/**
 * ✉️ Model: FacilityCorrespondence (Correspondência Recebida — Facilities)
 *
 * @module models/FacilityCorrespondence
 *
 * Tabela `facility_correspondence` (singular — migration
 * `20260807-000299`). Registro simples de correspondência, sem workflow
 * de aprovação (RF-FAC-048). Destinatário pode ser um funcionário
 * específico ou um departamento (ao menos um dos dois obrigatório, CHECK
 * no banco).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type FacilityCorrespondenceType = 'letter' | 'package' | 'document' | 'other';

interface FacilityCorrespondenceAttributes {
  id: number;
  received_at: Date;
  sender: string | null;
  recipient_employee_id: number | null;
  recipient_department_id: number | null;
  type: FacilityCorrespondenceType;
  delivered_at: Date | null;
  delivered_to: string | null;
  notes: string | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const FacilityCorrespondence = sequelize.define<any, FacilityCorrespondenceAttributes>('FacilityCorrespondence', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  received_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  sender: { type: DataTypes.STRING(150), allowNull: true },
  recipient_employee_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK → employees.id' },
  recipient_department_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK → departments.id' },
  type: { type: DataTypes.ENUM('letter', 'package', 'document', 'other'), allowNull: false, defaultValue: 'other' },
  delivered_at: { type: DataTypes.DATE, allowNull: true },
  delivered_to: { type: DataTypes.STRING(150), allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'facility_correspondence',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['recipient_employee_id'], name: 'idx_facility_correspondence_recipient_employee_id' },
    { fields: ['recipient_department_id'], name: 'idx_facility_correspondence_recipient_department_id' },
    { fields: ['received_at'], name: 'idx_facility_correspondence_received_at' },
  ],
});

export = FacilityCorrespondence;
