/**
 * 🔢 Model: InventoryCountItem (Item de Inventário Cíclico)
 *
 * @module models/InventoryCountItem
 *
 * Item individual de uma contagem de estoque (`InventoryCount`), com a
 * quantidade de sistema (fotografada no momento em que o item entra na
 * contagem), a quantidade contada fisicamente e a variância calculada.
 *
 * Workflow de status: `pending` → `counted` → `adjusted`.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type InventoryCountItemStatus = 'pending' | 'counted' | 'adjusted';

interface InventoryCountItemAttributes {
  id: number;
  inventory_count_id: number;
  product_id: number;
  item_id?: string | null;
  system_quantity: number;
  counted_quantity: number | null;
  variance_quantity: number | null;
  status: InventoryCountItemStatus;
  counted_by: number | null;
  counted_at: Date | null;
  notes: string | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const InventoryCountItem = sequelize.define('InventoryCountItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  inventory_count_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK → inventory_counts.id' },
  product_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK → products.id (LEGADO, dual-read com item_id — um dos dois deve estar preenchido)' },
  item_id: { type: DataTypes.UUID, allowNull: true, comment: 'FK → items.id (NOVO, parallel to product_id)' },
  system_quantity: { type: DataTypes.DECIMAL(12, 3), allowNull: false, defaultValue: 0, comment: 'Quantidade em sistema no momento em que o item entrou na contagem' },
  counted_quantity: { type: DataTypes.DECIMAL(12, 3), allowNull: true, comment: 'Quantidade contada fisicamente; NULL enquanto o item está pending. NOT NULL indevido removido na migration 20260810-000028' },
  variance_quantity: { type: DataTypes.DECIMAL(12, 3), allowNull: true, comment: 'counted_quantity - system_quantity; NULL enquanto o item está pending' },
  status: {
    type: DataTypes.ENUM('pending', 'counted', 'adjusted'),
    allowNull: false,
    defaultValue: 'pending'
  },
  counted_by: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK → users.id (quem contou o item); NULL enquanto pending. FK é ON DELETE SET NULL, o que exige coluna nullable' },
  counted_at: { type: DataTypes.DATE, allowNull: true, comment: 'Data/hora do registro da contagem do item; NULL enquanto pending' },
  notes: { type: DataTypes.TEXT, allowNull: true, comment: 'Observações livres do item contado (opcional)' }
}, {
  tableName: 'inventory_count_items',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['inventory_count_id'] },
    { fields: ['product_id'] },
    { fields: ['item_id'] },
    { fields: ['status'] }
  ]
});

export = InventoryCountItem;
