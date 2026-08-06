/**
 * 🛒 Model: Sale (Vendas)
 *
 * @module models/Sale
 *
 * Gerencia vendas com suporte a orçamento (quote), confirmação,
 * faturamento parcial/total (NF-e), expedição (shipped) e cancelamento.
 * Gera contas a receber.
 *
 * Fluxo de status: quote -> confirmed -> [partially_invoiced ->] invoiced
 * -> shipped -> (terminal). `partially_invoiced` (gap 3/3 do módulo
 * `sales`) é atingido automaticamente quando `POST /api/sales/:id/nfe` é
 * chamado com uma quantidade menor que o saldo pendente de algum item
 * (`IssueSaleNfeUseCase`) — nunca via `PUT /:id/status` manual, mesmo
 * tratamento hoje dado a `invoiced`. `canceled` é possível a partir de
 * quote/confirmed/partially_invoiced/invoiced, mas NÃO a partir de shipped
 * (venda já embarcada — ver `ChangeSaleStatusUseCase`). Embarque
 * (`shipped`) exige a venda totalmente `invoiced` (saldo pendente zerado
 * em todos os itens) + NF-e autorizada.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface SaleAttributes {
  id: number;
  customer_id: number;
  user_id: number;
  total_amount: number;
  discount: number;
  status: 'quote' | 'confirmed' | 'partially_invoiced' | 'invoiced' | 'shipped' | 'canceled';
  payment_method: 'cash' | 'credit_card' | 'debit_card' | 'pix' | 'boleto' | 'transfer';
  installments: number;
  notes: string;
  nfe_number: string | null;
  nfe_status: 'pending' | 'processing' | 'authorized' | 'denied' | 'cancelled';
  nfe_key: string | null;
  nfe_series: number | null;
  nfe_protocol: string | null;
  nfe_environment: 'homologacao' | 'producao' | null;
  nfe_provider_ref: string | null;
  nfe_xml_url: string | null;
  nfe_danfe_url: string | null;
  nfe_error_message: string | null;
  nfe_issued_at: Date | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const Sale = sequelize.define('Sale', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  customer_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK → clients.id' },
  user_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK → users.id (vendedor)' },
  total_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, comment: 'Valor total da venda' },
  discount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0, comment: 'Desconto concedido' },
  status: { type: DataTypes.ENUM('quote', 'confirmed', 'partially_invoiced', 'invoiced', 'shipped', 'canceled'), defaultValue: 'quote' },
  payment_method: { type: DataTypes.ENUM('cash', 'credit_card', 'debit_card', 'pix', 'boleto', 'transfer'), defaultValue: 'pix' },
  installments: { type: DataTypes.INTEGER, defaultValue: 1, comment: 'Número de parcelas' },
  notes: { type: DataTypes.TEXT, defaultValue: '' },
  nfe_number: DataTypes.STRING(50),
  nfe_status: { type: DataTypes.ENUM('pending', 'processing', 'authorized', 'denied', 'cancelled'), defaultValue: 'pending' },
  nfe_key: DataTypes.STRING(50),
  nfe_series: DataTypes.INTEGER,
  nfe_protocol: DataTypes.STRING(50),
  nfe_environment: DataTypes.ENUM('homologacao', 'producao'),
  nfe_provider_ref: DataTypes.STRING(100),
  nfe_xml_url: DataTypes.STRING(500),
  nfe_danfe_url: DataTypes.STRING(500),
  nfe_error_message: DataTypes.TEXT,
  nfe_issued_at: DataTypes.DATE
}, {
  tableName: 'sales',
  underscored: true,
  timestamps: true
});

export = Sale;
