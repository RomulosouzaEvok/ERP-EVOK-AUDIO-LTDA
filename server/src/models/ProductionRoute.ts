/**
 * Model: ProductionRoute
 *
 * Roteiro mestre de producao por produto acabado/subconjunto.
 * Define a versao aprovada de etapas industriais usadas pelo PCP.
 *
 * @module models/ProductionRoute
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface ProductionRouteAttributes {
  id: number;
  product_id: number;
  item_id?: string | null; // UUID (Fase 4.8 expand-contract)
  route_code: string;
  revision: string;
  status: 'draft' | 'active' | 'inactive' | 'superseded';
  description: string | null;
  total_standard_time_minutes: number;
  created_by: number | null;
  approved_by: number | null;
  approved_at: Date | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const ProductionRoute = sequelize.define('ProductionRoute', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  product_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK -> products.id (legacy)' },
  item_id: { type: DataTypes.UUID, allowNull: true, comment: 'FK -> items.id (Fase 4.8 expand-contract)' },
  route_code: { type: DataTypes.STRING(50), allowNull: false, unique: true, comment: 'Codigo unico do roteiro' },
  revision: { type: DataTypes.STRING(10), allowNull: false, defaultValue: '00', comment: 'Revisao do roteiro' },
  status: { type: DataTypes.ENUM('draft', 'active', 'inactive', 'superseded'), allowNull: false, defaultValue: 'draft' },
  description: { type: DataTypes.TEXT, allowNull: true },
  total_standard_time_minutes: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  created_by: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK -> users.id' },
  approved_by: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK -> users.id' },
  approved_at: { type: DataTypes.DATE, allowNull: true }
}, {
  tableName: 'production_routes',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['product_id'] },
    { fields: ['item_id'] },
    { fields: ['status'] },
    { fields: ['product_id', 'revision'], unique: true }
  ]
});

export = ProductionRoute;
