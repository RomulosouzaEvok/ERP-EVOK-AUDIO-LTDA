/**
 * 🔧 Model: MaintenanceOrder (Ordens de Manutenção)
 *
 * @module models/MaintenanceOrder
 *
 * Gerencia ordens de manutenção de ativos (máquinas, equipamentos).
 * Suporta manutenção preventiva, corretiva, preditiva e emergencial.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export interface MaintenanceOrderAttributes {
  id: number;
  order_number: string;
  asset_id: number;
  maintenance_type: 'preventive' | 'corrective' | 'predictive' | 'emergency' | 'overhaul';
  priority: 'low' | 'normal' | 'high' | 'emergency';
  problem_description: string;
  reported_by: number | null;
  report_date: string;
  diagnosed_problem: string | null;
  diagnosed_by: number | null;
  diagnosis_date: string | null;
  service_performed: string | null;
  technician_id: number | null;
  start_date: string | null;
  completion_date: string | null;
  parts_cost: number;
  labor_cost: number;
  total_cost: number;
  downtime_hours: number;
  result: 'completed' | 'partial' | 'transferred' | 'canceled' | null;
  notes: string | null;
  scheduled_date: string | null;
  frequency_days: number | null;
  next_maintenance_date: string | null;
  status: 'open' | 'scheduled' | 'in_progress' | 'waiting_parts' | 'completed' | 'canceled';
  created_by: number | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const MaintenanceOrder = sequelize.define('MaintenanceOrder', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  order_number: { type: DataTypes.STRING(20), allowNull: false, unique: true, comment: 'Nº da ordem de manutenção' },
  asset_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK → assets.id' },
  maintenance_type: { type: DataTypes.ENUM('preventive', 'corrective', 'predictive', 'emergency', 'overhaul'), allowNull: false },
  priority: { type: DataTypes.ENUM('low', 'normal', 'high', 'emergency'), defaultValue: 'normal' },
  problem_description: { type: DataTypes.TEXT, allowNull: false, comment: 'Descrição do problema relatado' },
  reported_by: { type: DataTypes.INTEGER, comment: 'FK → users.id' },
  report_date: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW },
  diagnosed_problem: DataTypes.TEXT,
  diagnosed_by: DataTypes.INTEGER,
  diagnosis_date: DataTypes.DATEONLY,
  service_performed: DataTypes.TEXT,
  technician_id: { type: DataTypes.INTEGER, comment: 'FK → users.id' },
  start_date: DataTypes.DATEONLY,
  completion_date: DataTypes.DATEONLY,
  parts_cost: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0, comment: 'Custo de peças' },
  labor_cost: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0, comment: 'Custo de mão de obra' },
  total_cost: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0, comment: 'Custo total' },
  downtime_hours: { type: DataTypes.DECIMAL(10, 1), defaultValue: 0, comment: 'Horas de parada' },
  result: { type: DataTypes.ENUM('completed', 'partial', 'transferred', 'canceled') },
  notes: DataTypes.TEXT,
  scheduled_date: DataTypes.DATEONLY,
  frequency_days: { type: DataTypes.INTEGER, comment: 'Frequência em dias para manutenção preventiva' },
  next_maintenance_date: DataTypes.DATEONLY,
  status: { type: DataTypes.ENUM('open', 'scheduled', 'in_progress', 'waiting_parts', 'completed', 'canceled'), defaultValue: 'open' },
  created_by: { type: DataTypes.INTEGER, comment: 'FK → users.id' }
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

export = MaintenanceOrder;
