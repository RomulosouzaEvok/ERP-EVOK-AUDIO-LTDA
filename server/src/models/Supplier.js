const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Supplier = sequelize.define('Supplier', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  company_name: { type: DataTypes.STRING(200), allowNull: false },
  trade_name: { type: DataTypes.STRING(200), defaultValue: '' },
  cnpj: { type: DataTypes.STRING(18), allowNull: false, unique: true },
  ie: DataTypes.STRING(20),
  phone: DataTypes.STRING(20),
  email: DataTypes.STRING(100),
  cep: DataTypes.STRING(10),
  street: DataTypes.STRING(200),
  number: DataTypes.STRING(20),
  complement: DataTypes.STRING(100),
  neighborhood: DataTypes.STRING(100),
  city: DataTypes.STRING(100),
  state: DataTypes.STRING(2),
  contact_name: DataTypes.STRING(100),
  contact_phone: DataTypes.STRING(20),
  payment_terms: DataTypes.STRING(100),
  delivery_time: { type: DataTypes.INTEGER, defaultValue: 15 },
  rating: { type: DataTypes.INTEGER, defaultValue: 3 },
  status: { type: DataTypes.ENUM('active', 'inactive', 'blocked'), defaultValue: 'active' },
  notes: DataTypes.TEXT
}, {
  tableName: 'suppliers',
  underscored: true,
  timestamps: true
});

module.exports = Supplier;

