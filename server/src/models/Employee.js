const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Employee = sequelize.define('Employee', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER },
  department_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(200), allowNull: false },
  cpf: { type: DataTypes.STRING(14), allowNull: false, unique: true },
  rg: DataTypes.STRING(20),
  pis_pasep: DataTypes.STRING(20),
  ctps: DataTypes.STRING(20),
  phone: DataTypes.STRING(20),
  email: DataTypes.STRING(100),
  address: DataTypes.TEXT,
  position: DataTypes.STRING(100),
  salary: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  salary_type: { type: DataTypes.ENUM('mensal', 'horista', 'comissionado'), defaultValue: 'mensal' },
  hire_date: { type: DataTypes.DATEONLY, allowNull: false },
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

module.exports = Employee;

