const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Sale = sequelize.define('Sale', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  customer_id: { type: DataTypes.INTEGER, allowNull: false },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  total_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  discount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  status: { type: DataTypes.ENUM('quote', 'confirmed', 'invoiced', 'canceled'), defaultValue: 'quote' },
  payment_method: { type: DataTypes.ENUM('cash', 'credit_card', 'debit_card', 'pix', 'boleto', 'transfer'), defaultValue: 'pix' },
  installments: { type: DataTypes.INTEGER, defaultValue: 1 },
  notes: { type: DataTypes.TEXT, defaultValue: '' },
  nfe_number: DataTypes.STRING(50),
  nfe_status: { type: DataTypes.ENUM('pending', 'processing', 'authorized', 'denied', 'cancelled'), defaultValue: 'pending' },
  nfe_key: DataTypes.STRING(50)
}, {
  tableName: 'sales',
  underscored: true,
  timestamps: true
});

module.exports = Sale;

