/**
 * 🔗 Model: ItemSupplier (Catálogo Item x Fornecedor)
 *
 * @module models/ItemSupplier
 *
 * Vínculo N:N entre `items` e `suppliers`, usado para registrar preço de
 * referência, prazo de entrega, quantidade mínima de compra (MOQ) e código
 * do item no catálogo de cada fornecedor. Suporta múltiplos fornecedores
 * por item, com um marcado como `preferred` (fornecedor preferencial).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export interface ItemSupplierAttributes {
  id: number;
  item_id: string;
  supplier_id: number;
  unit_price: number | null;
  currency: string;
  lead_time_days: number | null;
  moq: number | null;
  supplier_item_code: string | null;
  preferred: boolean;
  active: boolean;
  notes: string | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const ItemSupplier = sequelize.define('ItemSupplier', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  item_id: { type: DataTypes.UUID, allowNull: false, comment: 'FK -> items.id' },
  supplier_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK -> suppliers.id' },
  unit_price: { type: DataTypes.DECIMAL(18, 6), allowNull: true, comment: 'Preco unitario de referencia' },
  currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'BRL' },
  lead_time_days: { type: DataTypes.INTEGER, allowNull: true, comment: 'Prazo de entrega em dias' },
  moq: { type: DataTypes.DECIMAL(18, 6), allowNull: true, comment: 'Quantidade minima de compra' },
  supplier_item_code: { type: DataTypes.STRING(80), allowNull: true, comment: 'Codigo do item no catalogo do fornecedor' },
  preferred: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, comment: 'Fornecedor preferencial deste item' },
  active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'item_suppliers',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['item_id', 'supplier_id'], unique: true, name: 'uq_item_suppliers_item_supplier' },
    { fields: ['item_id'], name: 'idx_item_suppliers_item_id' },
    { fields: ['supplier_id'], name: 'idx_item_suppliers_supplier_id' },
  ],
});

export = ItemSupplier;
