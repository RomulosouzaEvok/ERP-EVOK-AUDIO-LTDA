/**
 * 📋 Model: Purchase (Pedidos de Compra)
 *
 * @module models/Purchase
 *
 * Gerencia pedidos de compra com workflow de status:
 * pending → approved → sent → partial/received → canceled.
 * Ao ser aprovado, gera AccountPayable.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export interface PurchaseAttributes {
  id: number;
  order_number: string;
  supplier_id: number;
  requester_id: number | null;
  status: 'pending' | 'approved' | 'sent' | 'partial' | 'received' | 'canceled';
  requisition_id: number | null;
  order_date: string;
  expected_date: string | null;
  delivery_date: string | null;
  freight_type: 'cif' | 'fob' | null;
  freight_value: number;
  total_amount: number;
  notes: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const Purchase = sequelize.define('Purchase', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  order_number: { type: DataTypes.STRING(20), allowNull: false, unique: true, comment: 'Nº do pedido (PO-timestamp)' },
  supplier_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK → suppliers.id' },
  requester_id: { type: DataTypes.INTEGER, comment: 'FK → users.id (solicitante)' },
  status: { type: DataTypes.ENUM('pending', 'approved', 'sent', 'partial', 'received', 'canceled'), defaultValue: 'pending' },
  requisition_id: DataTypes.INTEGER,
  order_date: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW },
  expected_date: DataTypes.DATEONLY,
  delivery_date: DataTypes.DATEONLY,
  freight_type: { type: DataTypes.ENUM('cif', 'fob'), comment: 'CIF=fornecedor responsável, FOB=comprador responsável' },
  freight_value: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  total_amount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0, comment: 'Valor total do pedido' },
  notes: DataTypes.TEXT,
  invoice_number: DataTypes.STRING(50),
  invoice_date: DataTypes.DATEONLY
}, {
  tableName: 'purchase_orders',
  underscored: true,
  timestamps: true
});

export = Purchase;

