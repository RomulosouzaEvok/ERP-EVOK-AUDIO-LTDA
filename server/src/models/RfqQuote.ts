/**
 * 📨 Model: RfqQuote (Resposta de cotacao — item x fornecedor)
 *
 * @module models/RfqQuote
 *
 * Preco/prazo/MOQ/validade digitados pelo comprador ao registrar a
 * resposta recebida de um fornecedor (email/telefone — nao ha portal do
 * fornecedor nesta v1). Unico por par (`rfq_item_id`, `supplier_id`):
 * registrar novamente atualiza (upsert) a cotacao existente.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface RfqQuoteAttributes {
  id: number;
  rfq_item_id: number;
  supplier_id: number;
  unit_price: number;
  lead_time_days: number | null;
  moq: number | null;
  validity_date: string | null;
  notes: string | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const RfqQuote = sequelize.define('RfqQuote', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  rfq_item_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK -> rfq_items.id' },
  supplier_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK -> suppliers.id' },
  unit_price: { type: DataTypes.DECIMAL(18, 6), allowNull: false, comment: 'Preco unitario cotado' },
  lead_time_days: { type: DataTypes.INTEGER, allowNull: true, comment: 'Prazo de entrega em dias' },
  moq: { type: DataTypes.DECIMAL(18, 6), allowNull: true, comment: 'Quantidade minima de compra' },
  validity_date: { type: DataTypes.DATEONLY, allowNull: true, comment: 'Validade da cotacao' },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'rfq_quotes',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['rfq_item_id', 'supplier_id'], unique: true, name: 'uq_rfq_quotes_item_supplier' },
    { fields: ['rfq_item_id'] },
    { fields: ['supplier_id'] },
  ],
});

export = RfqQuote;
