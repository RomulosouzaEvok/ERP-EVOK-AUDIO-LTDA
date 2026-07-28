const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AccountReceivable = sequelize.define('AccountReceivable', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  sale_id: { type: DataTypes.INTEGER },
  customer_id: { type: DataTypes.INTEGER, allowNull: false },
  installment: { type: DataTypes.INTEGER, defaultValue: 1 },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  due_date: { type: DataTypes.DATEONLY, allowNull: false },
  payment_date: DataTypes.DATEONLY,
  status: { type: DataTypes.ENUM('pending', 'paid', 'overdue', 'canceled'), defaultValue: 'pending' },
  payment_method: DataTypes.STRING(30),
  invoice_number: DataTypes.STRING(50),
  barcode: DataTypes.STRING(50),
  pix_key: DataTypes.STRING(100),
  interest: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  fine: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  discount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  collection_status: { type: DataTypes.ENUM('normal', 'warning', 'overdue_30', 'overdue_60', 'overdue_90', 'protested'), defaultValue: 'normal' },
  protest_date: DataTypes.DATEONLY,
  negativation_date: DataTypes.DATEONLY,
  notes: DataTypes.TEXT
}, {
  tableName: 'accounts_receivable',
  underscored: true,
  timestamps: true
});

module.exports = AccountReceivable;

