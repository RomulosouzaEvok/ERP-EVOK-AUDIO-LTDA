const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ProductionOrder = sequelize.define('ProductionOrder', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  order_number: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  product_id: { type: DataTypes.INTEGER, allowNull: false },
  quantity: { type: DataTypes.INTEGER, allowNull: false },
  quantity_produced: { type: DataTypes.INTEGER, defaultValue: 0 },
  priority: { type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'), defaultValue: 'normal' },
  status: { type: DataTypes.ENUM('planned', 'released', 'in_progress', 'completed', 'paused', 'canceled'), defaultValue: 'planned' },
  start_date: DataTypes.DATEONLY,
  due_date: { type: DataTypes.DATEONLY, allowNull: false },
  completion_date: DataTypes.DATEONLY,
  sales_order_id: { type: DataTypes.INTEGER },
  responsible_id: { type: DataTypes.INTEGER },
  notes: DataTypes.TEXT,
  created_by: { type: DataTypes.INTEGER }
}, {
  tableName: 'production_orders',
  underscored: true,
  timestamps: true
});

module.exports = ProductionOrder;

