/**
 * 🛒 Model: Sale (Vendas)
 *
 * @module models/Sale
 *
 * Gerencia vendas com suporte a orçamento (quote), confirmação,
 * faturamento (NF-e) e cancelamento. Gera contas a receber.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export interface SaleAttributes {
  id: number;
  customer_id: number;
  user_id: number;
  total_amount: number;
  discount: number;
  status: 'quote' | 'confirmed' | 'invoiced' | 'canceled';
  payment_method: 'cash' | 'credit_card' | 'debit_card' | 'pix' | 'boleto' | 'transfer';
  installments: number;
  notes: string;
  nfe_number: string | null;
  nfe_status: 'pending' | 'processing' | 'authorized' | 'denied' | 'cancelled';
  nfe_key: string | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const Sale = sequelize.define('Sale', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  customer_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK → clients.id' },
  user_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK → users.id (vendedor)' },
  total_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, comment: 'Valor total da venda' },
  discount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0, comment: 'Desconto concedido' },
  status: { type: DataTypes.ENUM('quote', 'confirmed', 'invoiced', 'canceled'), defaultValue: 'quote' },
  payment_method: { type: DataTypes.ENUM('cash', 'credit_card', 'debit_card', 'pix', 'boleto', 'transfer'), defaultValue: 'pix' },
  installments: { type: DataTypes.INTEGER, defaultValue: 1, comment: 'Número de parcelas' },
  notes: { type: DataTypes.TEXT, defaultValue: '' },
  nfe_number: DataTypes.STRING(50),
  nfe_status: { type: DataTypes.ENUM('pending', 'processing', 'authorized', 'denied', 'cancelled'), defaultValue: 'pending' },
  nfe_key: DataTypes.STRING(50)
}, {
  tableName: 'sales',
  underscored: true,
  timestamps: true
});

export = Sale;
