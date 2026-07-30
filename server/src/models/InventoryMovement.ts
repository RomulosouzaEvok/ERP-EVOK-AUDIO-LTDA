/**
 * 📦 Model: InventoryMovement (Movimentações de Estoque)
 *
 * @module models/InventoryMovement
 *
 * Registra todas as movimentações de estoque (entrada, saída, ajuste).
 * Toda alteração em Product.quantity DEVE passar por este model.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export interface InventoryMovementAttributes {
  id: number;
  product_id: number;
  user_id: number;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  unit_cost: number;
  description: string | null;
  reference_id: number | null;
  reference_type: 'sale' | 'purchase' | 'production' | 'adjustment' | 'transfer' | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const InventoryMovement = sequelize.define('InventoryMovement', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  product_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK → products.id' },
  user_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK → users.id (responsável)' },
  type: { type: DataTypes.ENUM('in', 'out', 'adjustment'), allowNull: false, comment: 'Tipo: in=entrada, out=saída, adjustment=ajuste' },
  quantity: { type: DataTypes.DECIMAL(18, 6), allowNull: false, comment: 'Quantidade movimentada' },
  unit_cost: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0, comment: 'Custo unitário no momento' },
  description: DataTypes.TEXT,
  reference_id: DataTypes.INTEGER,
  reference_type: { type: DataTypes.ENUM('sale', 'purchase', 'production', 'adjustment', 'transfer') }
}, {
  tableName: 'inventory_movements',
  underscored: true,
  timestamps: true
});

export = InventoryMovement;
