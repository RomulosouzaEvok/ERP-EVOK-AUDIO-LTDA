/**
 * Model: ProductionRouteStep
 *
 * Etapa sequencial de um roteiro de producao.
 *
 * @module models/ProductionRouteStep
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export interface ProductionRouteStepAttributes {
  id: number;
  production_route_id: number;
  sequence: number;
  step_code: string;
  name: string;
  work_center: string | null;
  work_center_id: number | null;
  standard_time_minutes: number;
  setup_time_minutes: number;
  instructions: string | null;
  quality_check_required: boolean;
  is_active: boolean;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const ProductionRouteStep = sequelize.define('ProductionRouteStep', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  production_route_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK -> production_routes.id' },
  sequence: { type: DataTypes.INTEGER, allowNull: false, comment: 'Ordem sequencial da etapa' },
  step_code: { type: DataTypes.STRING(50), allowNull: false, comment: 'Codigo da etapa' },
  name: { type: DataTypes.STRING(120), allowNull: false, comment: 'Nome da etapa' },
  work_center: { type: DataTypes.STRING(100), allowNull: true, comment: 'Posto/centro de trabalho (legado, texto livre)' },
  work_center_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK -> work_centers.id (centro de trabalho estruturado)' },
  standard_time_minutes: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  setup_time_minutes: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  instructions: { type: DataTypes.TEXT, allowNull: true },
  quality_check_required: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
}, {
  tableName: 'production_route_steps',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['production_route_id'] },
    { fields: ['production_route_id', 'sequence'], unique: true },
    { fields: ['work_center_id'], name: 'idx_production_route_steps_work_center_id' }
  ]
});

export = ProductionRouteStep;
