const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ServiceOrder = sequelize.define('ServiceOrder', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  order_number: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  client_id: { type: DataTypes.INTEGER, allowNull: false },
  product_id: { type: DataTypes.INTEGER },
  equipment_description: DataTypes.TEXT,
  reported_issue: DataTypes.TEXT,
  diagnosed_issue: DataTypes.TEXT,
  service_performed: DataTypes.TEXT,
  labor_cost: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  total_amount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  status: { type: DataTypes.ENUM('open', 'diagnosing', 'in_progress', 'waiting_parts', 'completed', 'delivered', 'canceled'), defaultValue: 'open' },
  priority: { type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'), defaultValue: 'normal' },
  entry_date: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW },
  completion_date: DataTypes.DATEONLY,
  delivery_date: DataTypes.DATEONLY,
  technician_id: { type: DataTypes.INTEGER },
  responsible_id: { type: DataTypes.INTEGER },
  warranty_days: { type: DataTypes.INTEGER, defaultValue: 90 },
  notes: DataTypes.TEXT,
  created_by: { type: DataTypes.INTEGER }
}, {
  tableName: 'service_orders',
  underscored: true,
  timestamps: true
});

module.exports = ServiceOrder;

