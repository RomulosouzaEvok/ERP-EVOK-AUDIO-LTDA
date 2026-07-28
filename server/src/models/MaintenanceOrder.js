const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MaintenanceOrder = sequelize.define('MaintenanceOrder', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  order_number: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  
  // Asset vinculado
  asset_id: { type: DataTypes.INTEGER, allowNull: false },
  
  // Tipo de manutenção
  maintenance_type: {
    type: DataTypes.ENUM('preventive', 'corrective', 'predictive', 'emergency', 'overhaul'),
    allowNull: false
  },
  priority: {
    type: DataTypes.ENUM('low', 'normal', 'high', 'emergency'),
    defaultValue: 'normal'
  },
  
  // Descrição do problema
  problem_description: { type: DataTypes.TEXT, allowNull: false },
  reported_by: { type: DataTypes.INTEGER },
  report_date: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW },
  
  // Diagnóstico
  diagnosed_problem: DataTypes.TEXT,
  diagnosed_by: DataTypes.INTEGER,
  diagnosis_date: DataTypes.DATEONLY,
  
  // Execução
  service_performed: DataTypes.TEXT,
  technician_id: { type: DataTypes.INTEGER },
  start_date: DataTypes.DATEONLY,
  completion_date: DataTypes.DATEONLY,
  
  // Peças utilizadas
  parts_cost: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  labor_cost: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  total_cost: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  downtime_hours: { type: DataTypes.DECIMAL(10, 1), defaultValue: 0 },
  
  // Resultado
  result: {
    type: DataTypes.ENUM('completed', 'partial', 'transferred', 'canceled')
  },
  notes: DataTypes.TEXT,
  
  // Agendamento futuro
  scheduled_date: DataTypes.DATEONLY,
  frequency_days: { type: DataTypes.INTEGER },
  next_maintenance_date: DataTypes.DATEONLY,
  
  // Status
  status: {
    type: DataTypes.ENUM('open', 'scheduled', 'in_progress', 'waiting_parts', 'completed', 'canceled'),
    defaultValue: 'open'
  },
  
  created_by: { type: DataTypes.INTEGER }
}, {
  tableName: 'maintenance_orders',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['status'] },
    { fields: ['maintenance_type'] },
    { fields: ['asset_id'] },
    { fields: ['technician_id'] }
  ]
});

module.exports = MaintenanceOrder;

