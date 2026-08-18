/**
 * 💳 Model: FinancialPaymentEvent
 *
 * Log append-only de baixas de contas a pagar/receber. Cada operação HTTP
 * gera um evento com `operation_id` único para impedir replay sequencial e
 * registrar o histórico das baixas.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

const FinancialPaymentEvent = sequelize.define('FinancialPaymentEvent', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  account_type: {
    type: DataTypes.ENUM('payable', 'receivable'),
    allowNull: false,
    comment: 'Tipo da conta afetada',
  },
  account_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'ID da conta afetada (accounts_payable.id ou accounts_receivable.id)',
  },
  amount_cents: {
    type: DataTypes.BIGINT,
    allowNull: false,
    comment: 'Valor baixado na operação, em centavos',
  },
  payment_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'Data financeira da baixa',
  },
  payment_method: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Forma de pagamento informada na baixa',
  },
  operation_id: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    comment: 'Chave de idempotência da operação',
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Usuário que executou a baixa',
  },
}, {
  tableName: 'financial_payment_events',
  underscored: true,
  timestamps: true,
  indexes: [
    { unique: true, fields: ['operation_id'], name: 'uq_financial_payment_events_operation_id' },
    { fields: ['account_type', 'account_id', 'created_at'], name: 'idx_financial_payment_events_account_created_at' },
  ],
});

export = FinancialPaymentEvent;
