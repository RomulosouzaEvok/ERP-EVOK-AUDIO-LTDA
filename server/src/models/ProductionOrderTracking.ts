/**
 * Model: ProductionOrderTracking
 *
 * Registro de execucao/apontamento por etapa da OP.
 *
 * @module models/ProductionOrderTracking
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export interface ProductionOrderTrackingAttributes {
  id: number;
  production_order_id: number;
  production_route_step_id: number | null;
  sequence: number;
  status: 'pending' | 'in_progress' | 'paused' | 'completed' | 'skipped';
  started_at: Date | null;
  finished_at: Date | null;
  operator_id: number | null;
  quantity_good: number;
  quantity_scrapped: number;
  notes: string | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const ProductionOrderTracking = sequelize.define('ProductionOrderTracking', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  production_order_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK -> production_orders.id' },
  production_route_step_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK -> production_route_steps.id' },
  sequence: { type: DataTypes.INTEGER, allowNull: false, comment: 'Sequencia da etapa na OP' },
  status: { type: DataTypes.ENUM('pending', 'in_progress', 'paused', 'completed', 'skipped'), allowNull: false, defaultValue: 'pending' },
  started_at: { type: DataTypes.DATE, allowNull: true },
  finished_at: { type: DataTypes.DATE, allowNull: true },
  operator_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK -> employees.id' },
  quantity_good: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  quantity_scrapped: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  notes: { type: DataTypes.TEXT, allowNull: true }
}, {
  tableName: 'production_order_tracking',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['production_order_id'] },
    { fields: ['production_route_step_id'] },
    { fields: ['production_order_id', 'sequence'], unique: true },
    { fields: ['status'] }
  ]
});

export = ProductionOrderTracking;
