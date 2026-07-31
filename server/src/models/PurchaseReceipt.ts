/**
 * 📦 Model: PurchaseReceipt (Recebimento de NF de Compra)
 *
 * @module models/PurchaseReceipt
 *
 * Registra cada NF de fornecedor recebida contra um pedido de compra.
 * O índice único (`purchase_id`, `invoice_number`) impede, a nível de
 * banco, que a mesma nota fiscal seja lançada duas vezes no mesmo pedido
 * — mesmo sob concorrência (dois operadores lançando a mesma NF ao mesmo
 * tempo).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export interface PurchaseReceiptAttributes {
  id: number;
  purchase_id: number;
  invoice_number: string;
  received_by: number | null;
  received_at: Date;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const PurchaseReceipt = sequelize.define('PurchaseReceipt', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  purchase_id: { type: DataTypes.INTEGER, allowNull: false },
  invoice_number: { type: DataTypes.STRING(50), allowNull: false },
  received_by: DataTypes.INTEGER,
  received_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: 'purchase_receipts',
  underscored: true,
  timestamps: true,
});

export = PurchaseReceipt;
