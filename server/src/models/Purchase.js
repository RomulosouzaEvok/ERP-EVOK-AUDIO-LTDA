const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Purchase = sequelize.define('Purchase', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  order_number: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  supplier_id: { type: DataTypes.INTEGER, allowNull: false },
  requester_id: { type: DataTypes.INTEGER },
  status: { type: DataTypes.ENUM('pending', 'approved', 'sent', 'partial', 'received', 'canceled'), defaultValue: 'pending' },
  requisition_id: DataTypes.INTEGER,
  order_date: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW },
  expected_date: DataTypes.DATEONLY,
  delivery_date: DataTypes.DATEONLY,
  freight_type: { type: DataTypes.ENUM('cif', 'fob') },
  freight_value: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  total_amount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  notes: DataTypes.TEXT,
  invoice_number: DataTypes.STRING(50),
  invoice_date: DataTypes.DATEONLY
}, {
  tableName: 'purchase_orders',
  underscored: true,
  timestamps: true
});

module.exports = Purchase;

