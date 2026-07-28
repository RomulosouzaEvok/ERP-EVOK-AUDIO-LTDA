const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Client = sequelize.define('Client', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(200), allowNull: false },
  cpf_cnpj: { type: DataTypes.STRING(18), allowNull: false, unique: true },
  phone: { type: DataTypes.STRING(20), defaultValue: '' },
  email: { type: DataTypes.STRING(100), defaultValue: '' },
  cep: DataTypes.STRING(10),
  street: DataTypes.STRING(200),
  number: DataTypes.STRING(20),
  complement: DataTypes.STRING(100),
  neighborhood: DataTypes.STRING(100),
  city: DataTypes.STRING(100),
  state: DataTypes.STRING(2),
  status: { type: DataTypes.ENUM('active', 'inactive'), defaultValue: 'active' },
  notes: { type: DataTypes.TEXT, defaultValue: '' },
  tax_regime: { type: DataTypes.ENUM('simples_nacional', 'lucro_presumido', 'lucro_real') },
  ie: DataTypes.STRING(20),
  im: DataTypes.STRING(20),
  ind_final: { type: DataTypes.ENUM('0', '1'), defaultValue: '0' },
  ind_ie: { type: DataTypes.ENUM('1', '2', '9'), defaultValue: '9' },
  cnae: DataTypes.STRING(10)
}, {
  tableName: 'clients',
  underscored: true,
  timestamps: true
});

module.exports = Client;
