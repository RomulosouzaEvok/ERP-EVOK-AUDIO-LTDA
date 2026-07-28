const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PurchaseItem = sequelize.define('PurchaseItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  purchase_id: { type: DataTypes.INTEGER, allowNull: false },
  product_id: { type: DataTypes.INTEGER, allowNull: false },
  quantity: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  unit_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  total_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  received_quantity: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  status: { type: DataTypes.ENUM('pending', 'partial', 'received', 'canceled'), defaultValue: 'pending' }
}, {
  tableName: 'purchase_order_items',
  underscored: true,
  timestamps: true
});

module.exports = PurchaseItem;

