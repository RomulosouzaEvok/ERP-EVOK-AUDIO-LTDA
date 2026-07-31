/**
 * 🏭 Model: ProductionOrder (Ordens de Produção)
 *
 * @module models/ProductionOrder
 *
 * Gerencia ordens de produção com workflow de status:
 * planned → released → in_progress → completed/paused/canceled.
 * Consome BOM e gera produto acabado no estoque.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export interface ProductionOrderAttributes {
  id: number;
  order_number: string;
  product_id: number;
  quantity: number;
  quantity_produced: number;
  quantity_scrapped: number;
  scrap_reason: string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'planned' | 'released' | 'in_progress' | 'completed' | 'paused' | 'canceled';
  start_date: string | null;
  due_date: string;
  completion_date: string | null;
  sales_order_id: number | null;
  responsible_id: number | null;
  notes: string | null;
  created_by: number | null;
  item_id?: string | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const ProductionOrder = sequelize.define('ProductionOrder', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  order_number: { type: DataTypes.STRING(20), allowNull: false, unique: true, comment: 'Nº da OP (OP-YYYY-XXXX)' },
  product_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK → products.id' },
  quantity: { type: DataTypes.DECIMAL(18, 6), allowNull: false, comment: 'Quantidade planejada' },
  quantity_produced: { type: DataTypes.DECIMAL(18, 6), defaultValue: 0, comment: 'Quantidade produzida' },
  quantity_scrapped: { type: DataTypes.DECIMAL(18, 6), defaultValue: 0, comment: 'Quantidade refugada na conclusao da OP (nao entra em estoque)' },
  scrap_reason: { type: DataTypes.TEXT, allowNull: true, comment: 'Motivo do refugo registrado na conclusao da OP' },
  priority: { type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'), defaultValue: 'normal' },
  status: { type: DataTypes.ENUM('planned', 'released', 'in_progress', 'completed', 'paused', 'canceled'), defaultValue: 'planned' },
  start_date: DataTypes.DATEONLY,
  due_date: { type: DataTypes.DATEONLY, allowNull: false, comment: 'Prazo final' },
  completion_date: DataTypes.DATEONLY,
  sales_order_id: { type: DataTypes.INTEGER, comment: 'FK → sales.id (pedido de venda associado)' },
  responsible_id: { type: DataTypes.INTEGER, comment: 'FK → employees.id (responsável)' },
  notes: DataTypes.TEXT,
  created_by: { type: DataTypes.INTEGER, comment: 'FK → users.id (criador)' },
  item_id: { type: DataTypes.UUID, comment: 'FK → items.id (Fase 4.4 expand-contract)' }
}, {
  tableName: 'production_orders',
  underscored: true,
  timestamps: true
});

export = ProductionOrder;
