/**
 * 🪪 Model: FacilityDriver (Condutor Autorizado — Facilities)
 *
 * @module models/FacilityDriver
 *
 * Tabela `facility_drivers` (migration `20260807-000292`). Condutor
 * autorizado a dirigir veículo da empresa (RF-FAC-011 a 015).
 * `employee_id` obrigatório e único (condutor terceirizado fora de escopo
 * P0). `authorized` reversível (suspensão não apaga histórico de uso).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface FacilityDriverAttributes {
  id: number;
  employee_id: number;
  cnh_number: string;
  cnh_category: string;
  cnh_valid_until: string;
  cnh_file_path: string | null;
  authorized: boolean;
  authorized_by: number | null;
  authorized_at: Date | null;
  notes: string | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const FacilityDriver = sequelize.define<any, FacilityDriverAttributes>('FacilityDriver', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  employee_id: { type: DataTypes.INTEGER, allowNull: false, unique: true, comment: 'FK → employees.id' },
  cnh_number: { type: DataTypes.STRING(20), allowNull: false },
  cnh_category: { type: DataTypes.STRING(5), allowNull: false },
  cnh_valid_until: { type: DataTypes.DATEONLY, allowNull: false },
  cnh_file_path: { type: DataTypes.STRING(500), allowNull: true },
  authorized: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  authorized_by: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK → users.id' },
  authorized_at: { type: DataTypes.DATE, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'facility_drivers',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['cnh_valid_until'], name: 'idx_facility_drivers_cnh_valid_until' },
    { fields: ['authorized'], name: 'idx_facility_drivers_authorized' },
  ],
});

export = FacilityDriver;
