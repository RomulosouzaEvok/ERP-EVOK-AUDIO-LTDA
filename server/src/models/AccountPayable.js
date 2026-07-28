const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AccountPayable = sequelize.define('AccountPayable', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  description: { type: DataTypes.STRING(200), allowNull: false },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  due_date: { type: DataTypes.DATEONLY, allowNull: false },
  payment_date: DataTypes.DATEONLY,
  status: { type: DataTypes.ENUM('pending', 'paid', 'overdue', 'canceled'), defaultValue: 'pending' },
  category: DataTypes.STRING(100),
  supplier_id: { type: DataTypes.INTEGER },
  purchase_id: { type: DataTypes.INTEGER },
  invoice_number: DataTypes.STRING(50),
  barcode: DataTypes.STRING(50),
  payment_type: { type: DataTypes.ENUM('ted', 'pix', 'boleto', 'cheque', 'dinheiro') },
  cost_center: DataTypes.STRING(100),
  notes: DataTypes.TEXT,
  approved_by: { type: DataTypes.INTEGER },
  approval_date: DataTypes.DATEONLY
}, {
  tableName: 'accounts_payable',
  underscored: true,
  timestamps: true
});

module.exports = AccountPayable;

