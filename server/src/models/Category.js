const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Category = sequelize.define('Category', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  description: { type: DataTypes.TEXT, defaultValue: '' },
  active: { type: DataTypes.BOOLEAN, defaultValue: true }
}, {
  tableName: 'product_categories',
  underscored: true,
  timestamps: true
});

module.exports = Category;

