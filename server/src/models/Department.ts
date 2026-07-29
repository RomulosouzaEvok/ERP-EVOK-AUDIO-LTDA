/**
 * 🏢 Model: Department (Departamentos)
 *
 * @module models/Department
 *
 * Gerencia os departamentos da fábrica com código único e gestor responsável.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export interface DepartmentAttributes {
  id: number;
  code: string;
  name: string;
  sigla: string;
  description: string | null;
  manager_id: number | null;
  active: boolean;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const Department = sequelize.define('Department', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  code: { type: DataTypes.STRING(10), allowNull: false, comment: 'Código único do departamento' },
  name: { type: DataTypes.STRING(100), allowNull: false, comment: 'Nome do departamento' },
  sigla: { type: DataTypes.STRING(10), allowNull: false, comment: 'Sigla (DIR, RH, ENG, etc.)' },
  description: DataTypes.TEXT,
  manager_id: { type: DataTypes.INTEGER, comment: 'FK → employees.id (gestor)' },
  active: { type: DataTypes.BOOLEAN, defaultValue: true }
}, {
  tableName: 'departments',
  underscored: true,
  timestamps: true,
  indexes: [
    { unique: true, fields: ['code'] },
    { unique: true, fields: ['sigla'] }
  ]
});

export = Department;
