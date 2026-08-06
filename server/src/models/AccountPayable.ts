/**
 * 💰 Model: AccountPayable (Contas a Pagar)
 *
 * @module models/AccountPayable
 *
 * Gerencia contas a pagar geradas por compras aprovadas ou
 * lançamentos manuais (contas de luz, aluguel, etc.).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface AccountPayableAttributes {
  id: number;
  description: string;
  amount: number;
  amount_paid: number;
  due_date: string;
  payment_date: string | null;
  status: 'pending' | 'partial' | 'paid' | 'overdue' | 'canceled';
  category: string | null;
  supplier_id: number | null;
  purchase_id: number | null;
  invoice_number: string | null;
  barcode: string | null;
  payment_type: 'ted' | 'pix' | 'boleto' | 'cheque' | 'dinheiro' | null;
  cost_center: string | null;
  notes: string | null;
  approved_by: number | null;
  approval_date: string | null;
  invoice_type: 'nfe' | 'nfse' | null;
  cost_center_id: number | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const AccountPayable = sequelize.define('AccountPayable', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  description: { type: DataTypes.STRING(200), allowNull: false, comment: 'Descrição da conta' },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, comment: 'Valor TOTAL da conta (nunca sobrescrito por pagamentos parciais)' },
  amount_paid: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0, comment: 'Soma de todos os valores ja pagos' },
  due_date: { type: DataTypes.DATEONLY, allowNull: false, comment: 'Data de vencimento' },
  payment_date: DataTypes.DATEONLY,
  status: { type: DataTypes.ENUM('pending', 'partial', 'paid', 'overdue', 'canceled'), defaultValue: 'pending' },
  category: DataTypes.STRING(100),
  supplier_id: { type: DataTypes.INTEGER, comment: 'FK → suppliers.id' },
  purchase_id: { type: DataTypes.INTEGER, comment: 'FK → purchase_orders.id' },
  invoice_number: DataTypes.STRING(50),
  barcode: DataTypes.STRING(50),
  payment_type: { type: DataTypes.ENUM('ted', 'pix', 'boleto', 'cheque', 'dinheiro') },
  cost_center: DataTypes.STRING(100),
  notes: DataTypes.TEXT,
  approved_by: { type: DataTypes.INTEGER, comment: 'FK → users.id' },
  approval_date: DataTypes.DATEONLY,
  invoice_type: { type: DataTypes.ENUM('nfe', 'nfse'), allowNull: true, comment: 'Tipo de nota vinculada: nfe (mercadoria) ou nfse (serviço/licença digital)' },
  cost_center_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK → cost_centers.id (opcional; NULL = "Sem centro de custo" nos relatórios). Substitui gradualmente o campo livre `cost_center` (STRING)' }
}, {
  tableName: 'accounts_payable',
  underscored: true,
  timestamps: true
});

export = AccountPayable;
