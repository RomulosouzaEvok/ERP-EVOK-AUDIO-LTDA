/**
 * 👷 Model: Employee (Funcionários)
 *
 * @module models/Employee
 *
 * Gerencia dados de funcionários da fábrica: dados pessoais,
 * contratuais, bancários e controle de ponto.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface EmployeeAttributes {
  id: number;
  user_id: number | null;
  department_id: number;
  name: string;
  cpf: string;
  rg: string | null;
  pis_pasep: string | null;
  ctps: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  position: string | null;
  salary: number;
  salary_type: 'mensal' | 'horista' | 'comissionado';
  hire_date: string;
  dismissal_date: string | null;
  status: 'active' | 'inactive' | 'fired' | 'vacation' | 'license';
  shift: 'morning' | 'afternoon' | 'night' | 'commercial' | 'rotating';
  work_regime: 'clt' | 'pj' | 'estagiario' | 'aprendiz';
  work_hours_weekly: number;
  bank_name: string | null;
  bank_agency: string | null;
  bank_account: string | null;
  bank_account_type: 'corrente' | 'poupanca';
  pix_key: string | null;
  education_level: string | null;
  emergency_contact: string | null;
  emergency_phone: string | null;
  notes: string | null;
  photo_url: string | null;
  /** RF-RH-067 (BLOCO 6 RH) — indicador PCD para cálculo de quota legal (BR-RH-018). Dado sensível — ver SENSITIVE_EMPLOYEE_FIELDS. */
  pcd: boolean | null;
  /** RF-RH-025 (BLOCO 6 RH) — FK opcional para `hr_job_positions.id`; `position` (texto livre) permanece válido. */
  job_position_id: number | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const Employee = sequelize.define('Employee', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK → users.id (vinculo com usuário do sistema)' },
  department_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK → departments.id' },
  name: { type: DataTypes.STRING(200), allowNull: false, comment: 'Nome completo' },
  cpf: { type: DataTypes.STRING(14), allowNull: false, unique: true, comment: 'CPF (apenas números)' },
  rg: { type: DataTypes.STRING(20), allowNull: true },
  pis_pasep: { type: DataTypes.STRING(20), allowNull: true },
  ctps: { type: DataTypes.STRING(20), allowNull: true },
  phone: { type: DataTypes.STRING(20), allowNull: true },
  email: { type: DataTypes.STRING(100), allowNull: true },
  address: { type: DataTypes.TEXT, allowNull: true },
  position: { type: DataTypes.STRING(100), allowNull: true },
  salary: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0, comment: 'Salário' },
  salary_type: { type: DataTypes.ENUM('mensal', 'horista', 'comissionado'), defaultValue: 'mensal' },
  hire_date: { type: DataTypes.DATEONLY, allowNull: false, comment: 'Data de admissão' },
  dismissal_date: { type: DataTypes.DATEONLY, allowNull: true },
  status: { type: DataTypes.ENUM('active', 'inactive', 'fired', 'vacation', 'license'), defaultValue: 'active' },
  shift: { type: DataTypes.ENUM('morning', 'afternoon', 'night', 'commercial', 'rotating'), defaultValue: 'commercial' },
  work_regime: { type: DataTypes.ENUM('clt', 'pj', 'estagiario', 'aprendiz'), defaultValue: 'clt' },
  work_hours_weekly: { type: DataTypes.INTEGER, defaultValue: 44 },
  bank_name: { type: DataTypes.STRING(100), allowNull: true },
  bank_agency: { type: DataTypes.STRING(10), allowNull: true },
  bank_account: { type: DataTypes.STRING(20), allowNull: true },
  bank_account_type: { type: DataTypes.ENUM('corrente', 'poupanca'), defaultValue: 'corrente' },
  pix_key: { type: DataTypes.STRING(100), allowNull: true },
  education_level: { type: DataTypes.STRING(50), allowNull: true },
  emergency_contact: { type: DataTypes.STRING(100), allowNull: true },
  emergency_phone: { type: DataTypes.STRING(20), allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
  photo_url: { type: DataTypes.STRING(255), allowNull: true },
  pcd: { type: DataTypes.BOOLEAN, allowNull: true, comment: 'RF-RH-067 - indicador PCD (dado sensivel, BR-RH-020)' },
  job_position_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'RF-RH-025 - FK opcional para hr_job_positions.id' },
}, {
  tableName: 'employees',
  underscored: true,
  timestamps: true
});

export = Employee;
