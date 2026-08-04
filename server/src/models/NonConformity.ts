/**
 * ⚠️ Model: NonConformity (Não Conformidades - Qualidade)
 *
 * @module models/NonConformity
 *
 * Gerencia não conformidades do sistema de qualidade:
 * origem (inspeção, reclamação, auditoria), severidade,
 * análise de causa raiz, ação corretiva e verificação de eficácia.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface NonConformityAttributes {
  id: number;
  nc_number: string;
  origin: 'incoming' | 'in_process' | 'final' | 'audit' | 'customer_complaint' | 'supplier';
  product_id: number | null;
  purchase_item_id: number | null;
  production_order_id: number | null;
  service_order_id: number | null;
  supplier_id: number | null;
  description: string;
  defect_type: 'dimensional' | 'visual' | 'electrical' | 'acoustic' | 'material' | 'packaging' | 'other';
  severity: 'critical' | 'major' | 'minor';
  quantity_affected: number;
  immediate_action: 'rework' | 'scrap' | 'return_supplier' | 'use_as_is' | 'sorting' | 'other';
  immediate_action_desc: string | null;
  root_cause: string | null;
  root_cause_category: 'material' | 'machine' | 'method' | 'manpower' | 'measurement' | 'environment' | null;
  corrective_action: string | null;
  corrective_action_deadline: string | null;
  responsible_id: number | null;
  effectiveness_check: string | null;
  effectiveness_date: string | null;
  effectiveness_result: 'effective' | 'partially_effective' | 'ineffective' | null;
  status: 'open' | 'analysis' | 'corrective_action' | 'effectiveness_check' | 'closed' | 'canceled';
  lot_number: string | null;
  batch_number: string | null;
  report_date: string;
  closed_date: string | null;
  scrap_cost: number;
  rework_cost: number;
  total_cost: number;
  reported_by: number;
  closed_by: number | null;
  notes: string | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const NonConformity = sequelize.define('NonConformity', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nc_number: { type: DataTypes.STRING(20), allowNull: false, unique: true, comment: 'Nº da não conformidade' },
  origin: { type: DataTypes.ENUM('incoming', 'in_process', 'final', 'audit', 'customer_complaint', 'supplier'), allowNull: false, comment: 'Origem da NC' },
  product_id: { type: DataTypes.INTEGER, comment: 'FK → products.id' },
  purchase_item_id: { type: DataTypes.INTEGER },
  production_order_id: { type: DataTypes.INTEGER, comment: 'FK → production_orders.id' },
  service_order_id: { type: DataTypes.INTEGER },
  supplier_id: { type: DataTypes.INTEGER, comment: 'FK → suppliers.id' },
  description: { type: DataTypes.TEXT, allowNull: false, comment: 'Descrição da NC' },
  defect_type: { type: DataTypes.ENUM('dimensional', 'visual', 'electrical', 'acoustic', 'material', 'packaging', 'other'), allowNull: false },
  severity: { type: DataTypes.ENUM('critical', 'major', 'minor'), allowNull: false },
  quantity_affected: { type: DataTypes.INTEGER, defaultValue: 0 },
  immediate_action: { type: DataTypes.ENUM('rework', 'scrap', 'return_supplier', 'use_as_is', 'sorting', 'other'), defaultValue: 'rework' },
  immediate_action_desc: DataTypes.TEXT,
  root_cause: DataTypes.TEXT,
  root_cause_category: { type: DataTypes.ENUM('material', 'machine', 'method', 'manpower', 'measurement', 'environment') },
  corrective_action: DataTypes.TEXT,
  corrective_action_deadline: DataTypes.DATEONLY,
  responsible_id: { type: DataTypes.INTEGER, comment: 'FK → users.id' },
  effectiveness_check: DataTypes.TEXT,
  effectiveness_date: DataTypes.DATEONLY,
  effectiveness_result: { type: DataTypes.ENUM('effective', 'partially_effective', 'ineffective') },
  status: { type: DataTypes.ENUM('open', 'analysis', 'corrective_action', 'effectiveness_check', 'closed', 'canceled'), defaultValue: 'open' },
  lot_number: DataTypes.STRING(50),
  batch_number: DataTypes.STRING(50),
  report_date: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW },
  closed_date: DataTypes.DATEONLY,
  scrap_cost: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  rework_cost: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  total_cost: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  reported_by: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK → users.id (quem reportou)' },
  closed_by: { type: DataTypes.INTEGER, comment: 'FK → users.id (quem encerrou)' },
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

export = NonConformity;
