const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Asset = sequelize.define('Asset', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tag: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  name: { type: DataTypes.STRING(200), allowNull: false },
  description: DataTypes.TEXT,
  product_id: { type: DataTypes.INTEGER },
  department_id: { type: DataTypes.INTEGER },
  responsible_id: { type: DataTypes.INTEGER },
  location: DataTypes.STRING(100),
  asset_type: { type: DataTypes.ENUM('machine', 'equipment', 'tool', 'furniture', 'vehicle', 'it', 'other'), defaultValue: 'equipment' },
  brand: DataTypes.STRING(100),
  model: DataTypes.STRING(100),
  serial_number: DataTypes.STRING(100),
  purchase_date: DataTypes.DATEONLY,
  purchase_value: { type: DataTypes.DECIMAL(10, 2) },
  current_value: { type: DataTypes.DECIMAL(10, 2) },
  useful_life_months: DataTypes.INTEGER,
  status: { type: DataTypes.ENUM('active', 'in_maintenance', 'decommissioned', 'lost'), defaultValue: 'active' },
  qr_code: DataTypes.STRING(255),
  notes: DataTypes.TEXT,
  last_inventory_date: DataTypes.DATEONLY
}, {
  tableName: 'assets',
  underscored: true,
  timestamps: true
});

module.exports = Asset;

