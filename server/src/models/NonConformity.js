const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const NonConformity = sequelize.define('NonConformity', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nc_number: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  
  // Origem
  origin: { 
    type: DataTypes.ENUM('incoming', 'in_process', 'final', 'audit', 'customer_complaint', 'supplier'),
    allowNull: false 
  },
  product_id: { type: DataTypes.INTEGER },
  purchase_item_id: { type: DataTypes.INTEGER },
  production_order_id: { type: DataTypes.INTEGER },
  service_order_id: { type: DataTypes.INTEGER },
  supplier_id: { type: DataTypes.INTEGER },
  
  // Descrição da NC
  description: { type: DataTypes.TEXT, allowNull: false },
  defect_type: {
    type: DataTypes.ENUM('dimensional', 'visual', 'electrical', 'acoustic', 'material', 'packaging', 'other'),
    allowNull: false
  },
  severity: {
    type: DataTypes.ENUM('critical', 'major', 'minor'),
    allowNull: false
  },
  quantity_affected: { type: DataTypes.INTEGER, defaultValue: 0 },
  
  // Ação imediata
  immediate_action: {
    type: DataTypes.ENUM('rework', 'scrap', 'return_supplier', 'use_as_is', 'sorting', 'other'),
    defaultValue: 'rework'
  },
  immediate_action_desc: DataTypes.TEXT,
  
  // Análise de causa raiz
  root_cause: DataTypes.TEXT,
  root_cause_category: {
    type: DataTypes.ENUM('material', 'machine', 'method', 'manpower', 'measurement', 'environment'),
  },
  
  // Ação corretiva
  corrective_action: DataTypes.TEXT,
  corrective_action_deadline: DataTypes.DATEONLY,
  responsible_id: { type: DataTypes.INTEGER },
  
  // Verificação da eficácia
  effectiveness_check: DataTypes.TEXT,
  effectiveness_date: DataTypes.DATEONLY,
  effectiveness_result: { type: DataTypes.ENUM('effective', 'partially_effective', 'ineffective') },
  
  // Status
  status: {
    type: DataTypes.ENUM('open', 'analysis', 'corrective_action', 'effectiveness_check', 'closed', 'canceled'),
    defaultValue: 'open'
  },
  
  // Rastreabilidade
  lot_number: DataTypes.STRING(50),
  batch_number: DataTypes.STRING(50),
  report_date: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW },
  closed_date: DataTypes.DATEONLY,
  
  // Custos
  scrap_cost: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  rework_cost: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  total_cost: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  
  // Responsáveis
  reported_by: { type: DataTypes.INTEGER, allowNull: false },
  closed_by: DataTypes.INTEGER,
  
  notes: DataTypes.TEXT
}, {
  tableName: 'non_conformities',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['status'] },
    { fields: ['origin'] },
    { fields: ['severity'] },
    { fields: ['product_id'] },
    { fields: ['production_order_id'] }
  ]
});

module.exports = NonConformity;

