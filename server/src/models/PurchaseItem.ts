/**
 * 📋 Model: PurchaseItem (Itens do Pedido de Compra)
 *
 * @module models/PurchaseItem
 *
 * Itens que compõem um pedido de compra com controle de
 * quantidade recebida parcialmente.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export interface PurchaseItemAttributes {
  id: number;
  purchase_id: number;
  product_id: number;
  item_id?: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  received_quantity: number;
  status: 'pending' | 'partial' | 'received' | 'canceled';
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const PurchaseItem = sequelize.define('PurchaseItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  purchase_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK → purchase_orders.id' },
  product_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK → products.id' },
  item_id: { type: DataTypes.UUID, allowNull: true, comment: 'FK → items.id (expand-contract Fase 4.2)' },
  quantity: { type: DataTypes.DECIMAL(10, 2), allowNull: false, comment: 'Quantidade pedida' },
  unit_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false, comment: 'Preço unitário' },
  total_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false, comment: 'Total (qtd × preço)' },
  received_quantity: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0, comment: 'Quantidade já recebida' },
  status: { type: DataTypes.ENUM('pending', 'partial', 'received', 'canceled'), defaultValue: 'pending' }
}, {
  tableName: 'purchase_order_items',
  underscored: true,
  timestamps: true
});

export = PurchaseItem;
