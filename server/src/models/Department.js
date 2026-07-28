const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Department = sequelize.define('Department', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  code: { type: DataTypes.STRING(10), allowNull: false },
  name: { type: DataTypes.STRING(100), allowNull: false },
  sigla: { type: DataTypes.STRING(10), allowNull: false },
  description: DataTypes.TEXT,
  manager_id: { type: DataTypes.INTEGER },
  active: { type: DataTypes.BOOLEAN, defaultValue: true }
}, {
  tableName: 'departments',
  underscored: true,
  timestamps: true,
  indexes: [{ unique: true, fields: ['code'] }, { unique: true, fields: ['sigla'] }]
});

module.exports = Department;

