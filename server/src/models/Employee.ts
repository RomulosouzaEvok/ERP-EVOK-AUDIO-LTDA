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

export interface EmployeeAttributes {
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
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const Employee = sequelize.define('Employee', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, comment: 'FK → users.id (vinculo com usuário do sistema)' },
  department_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK → departments.id' },
  name: { type: DataTypes.STRING(200), allowNull: false, comment: 'Nome completo' },
  cpf: { type: DataTypes.STRING(14), allowNull: false, unique: true, comment: 'CPF (apenas números)' },
  rg: DataTypes.STRING(20),
  pis_pasep: DataTypes.STRING(20),
  ctps: DataTypes.STRING(20),
  phone: DataTypes.STRING(20),
  email: DataTypes.STRING(100),
  address: DataTypes.TEXT,
  position: DataTypes.STRING(100),
  salary: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0, comment: 'Salário' },
  salary_type: { type: DataTypes.ENUM('mensal', 'horista', 'comissionado'), defaultValue: 'mensal' },
  hire_date: { type: DataTypes.DATEONLY, allowNull: false, comment: 'Data de admissão' },
  dismissal_date: DataTypes.DATEONLY,
  status: { type: DataTypes.ENUM('active', 'inactive', 'fired', 'vacation', 'license'), defaultValue: 'active' },
  shift: { type: DataTypes.ENUM('morning', 'afternoon', 'night', 'commercial', 'rotating'), defaultValue: 'commercial' },
  work_regime: { type: DataTypes.ENUM('clt', 'pj', 'estagiario', 'aprendiz'), defaultValue: 'clt' },
  work_hours_weekly: { type: DataTypes.INTEGER, defaultValue: 44 },
  bank_name: DataTypes.STRING(100),
  bank_agency: DataTypes.STRING(10),
  bank_account: DataTypes.STRING(20),
  bank_account_type: { type: DataTypes.ENUM('corrente', 'poupanca'), defaultValue: 'corrente' },
  pix_key: DataTypes.STRING(100),
  education_level: DataTypes.STRING(50),
  emergency_contact: DataTypes.STRING(100),
  emergency_phone: DataTypes.STRING(20),
  notes: DataTypes.TEXT,
  photo_url: DataTypes.STRING(255)
}, {
  tableName: 'employees',
  underscored: true,
  timestamps: true
});

export = Employee;
