/**
 * 🛒 Model: SaleItem (Itens da Venda)
 *
 * @module models/SaleItem
 *
 * Itens que compõem uma venda, com produto, quantidade e preços.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export interface SaleItemAttributes {
  id: number;
  sale_id: number;
  product_id: number;
  item_id?: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const SaleItem = sequelize.define('SaleItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  sale_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK → sales.id' },
  product_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK → products.id (LEGADO)' },
  item_id: { type: DataTypes.UUID, allowNull: true, comment: 'FK → items.id (NOVO, parallel to product_id)' },
  quantity: { type: DataTypes.DECIMAL(18, 6), allowNull: false, comment: 'Quantidade vendida' },
  unit_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false, comment: 'Preço unitário' },
  total_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false, comment: 'Total (qtd × preço)' }
}, {
  tableName: 'sale_items',
  underscored: true,
  timestamps: true
});

export = SaleItem;
