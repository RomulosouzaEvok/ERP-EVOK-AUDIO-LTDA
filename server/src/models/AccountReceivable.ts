/**
 * 💰 Model: AccountReceivable (Contas a Receber)
 *
 * @module models/AccountReceivable
 *
 * Gerencia parcelas de contas a receber geradas a partir de vendas.
 * Suporta controle de cobrança (collection_status) e juros/multa.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export interface AccountReceivableAttributes {
  id: number;
  sale_id: number | null;
  customer_id: number;
  installment: number;
  amount: number;
  due_date: string;
  payment_date: string | null;
  status: 'pending' | 'paid' | 'overdue' | 'canceled';
  payment_method: string | null;
  invoice_number: string | null;
  barcode: string | null;
  pix_key: string | null;
  interest: number;
  fine: number;
  discount: number;
  collection_status: 'normal' | 'warning' | 'overdue_30' | 'overdue_60' | 'overdue_90' | 'protested';
  protest_date: string | null;
  negativation_date: string | null;
  notes: string | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const AccountReceivable = sequelize.define('AccountReceivable', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  sale_id: { type: DataTypes.INTEGER, comment: 'FK → sales.id (venda de origem)' },
  customer_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK → clients.id' },
  installment: { type: DataTypes.INTEGER, defaultValue: 1, comment: 'Nº da parcela' },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, comment: 'Valor da parcela' },
  due_date: { type: DataTypes.DATEONLY, allowNull: false, comment: 'Data de vencimento' },
  payment_date: DataTypes.DATEONLY,
  status: { type: DataTypes.ENUM('pending', 'paid', 'overdue', 'canceled'), defaultValue: 'pending' },
  payment_method: DataTypes.STRING(30),
  invoice_number: DataTypes.STRING(50),
  barcode: DataTypes.STRING(50),
  pix_key: DataTypes.STRING(100),
  interest: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0, comment: 'Juros' },
  fine: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0, comment: 'Multa' },
  discount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0, comment: 'Desconto' },
  collection_status: { type: DataTypes.ENUM('normal', 'warning', 'overdue_30', 'overdue_60', 'overdue_90', 'protested'), defaultValue: 'normal' },
  protest_date: DataTypes.DATEONLY,
  negativation_date: DataTypes.DATEONLY,
  notes: DataTypes.TEXT
}, {
  tableName: 'accounts_receivable',
  underscored: true,
  timestamps: true
});

export = AccountReceivable;
