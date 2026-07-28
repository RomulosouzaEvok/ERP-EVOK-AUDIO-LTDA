const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const InventoryMovement = sequelize.define('InventoryMovement', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  product_id: { type: DataTypes.INTEGER, allowNull: false },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  type: { type: DataTypes.ENUM('in', 'out', 'adjustment'), allowNull: false },
  quantity: { type: DataTypes.INTEGER, allowNull: false },
  unit_cost: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  description: DataTypes.TEXT,
  reference_id: DataTypes.INTEGER,
  reference_type: { type: DataTypes.ENUM('sale', 'purchase', 'production', 'adjustment', 'transfer') },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  tableName: 'inventory_movements',
  underscored: true,
  timestamps: true
});

module.exports = InventoryMovement;

