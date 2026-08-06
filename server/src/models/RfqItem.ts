/**
 * 📨 Model: RfqItem (Item cotado dentro de uma RFQ)
 *
 * @module models/RfqItem
 *
 * Item a ser cotado por um ou mais fornecedores convidados. `awarded_*`
 * ficam `null` ate a adjudicacao (`POST /api/rfqs/:id/award`), que congela
 * o fornecedor vencedor e o preco cotado para auditoria/exibicao rapida.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface RfqItemAttributes {
  id: number;
  rfq_id: number;
  item_id: string;
  quantity: number;
  unit: string | null;
  awarded_supplier_id: number | null;
  awarded_unit_price: number | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const RfqItem = sequelize.define('RfqItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  rfq_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK -> rfqs.id' },
  item_id: { type: DataTypes.UUID, allowNull: false, comment: 'FK -> items.id' },
  quantity: { type: DataTypes.DECIMAL(18, 6), allowNull: false, comment: 'Quantidade a cotar' },
  unit: { type: DataTypes.STRING(12), allowNull: true },
  awarded_supplier_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK -> suppliers.id, preenchido na adjudicacao' },
  awarded_unit_price: { type: DataTypes.DECIMAL(18, 6), allowNull: true, comment: 'Preco unitario cotado do vencedor, congelado na adjudicacao' },
}, {
  tableName: 'rfq_items',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['rfq_id'] },
    { fields: ['item_id'] },
    { fields: ['awarded_supplier_id'] },
  ],
});

export = RfqItem;
