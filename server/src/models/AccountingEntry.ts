/**
 * 📗 Model: AccountingEntry (Lançamento Contábil — Contabilidade)
 *
 * @module models/AccountingEntry
 *
 * Cabeçalho de um lançamento de partida dobrada do módulo Contabilidade
 * (subárea CONT do departamento Financeiro —
 * `docs/financeiro/02-CONTABILIDADE.md`). `entry_number` é sequencial
 * (`LC-000001`, gerado por `CreateEntryUseCase`). Ciclo de vida via
 * `status`: `draft` (itens editáveis livremente) → `posted` (soma de débito
 * = soma de crédito nos itens, validado por `PostEntryUseCase`; itens ficam
 * imutáveis) → `reversed` (desfeito via `ReverseEntryUseCase`, que cria um
 * NOVO lançamento de estorno com débito/crédito invertidos — o lançamento
 * original nunca é apagado, só marcado `reversed`).
 *
 * `reversal_of_id` é auto-relacionamento nullable: quando preenchido, este
 * registro É o lançamento de estorno, apontando para o lançamento original
 * que ele reverteu.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type AccountingEntryType =
  | 'receipt' | 'payment' | 'sales' | 'purchase' | 'payroll' | 'depreciation' | 'closing' | 'adjustment';

type AccountingEntryStatus = 'draft' | 'posted' | 'reversed';

interface AccountingEntryAttributes {
  id: number;
  entry_number: string;
  entry_date: string;
  description: string;
  entry_type: AccountingEntryType;
  status: AccountingEntryStatus;
  created_by: number;
  approved_by: number | null;
  approved_at: Date | null;
  reversal_of_id: number | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const AccountingEntry = sequelize.define('AccountingEntry', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  entry_number: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  entry_date: { type: DataTypes.DATEONLY, allowNull: false },
  description: { type: DataTypes.STRING(255), allowNull: false },
  entry_type: {
    type: DataTypes.ENUM('receipt', 'payment', 'sales', 'purchase', 'payroll', 'depreciation', 'closing', 'adjustment'),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('draft', 'posted', 'reversed'),
    allowNull: false,
    defaultValue: 'draft',
  },
  created_by: { type: DataTypes.INTEGER, allowNull: false },
  approved_by: { type: DataTypes.INTEGER, allowNull: true },
  approved_at: { type: DataTypes.DATE, allowNull: true },
  reversal_of_id: { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName: 'accounting_entries',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['entry_number'], name: 'uq_accounting_entries_entry_number', unique: true },
    { fields: ['status'], name: 'idx_accounting_entries_status' },
    { fields: ['entry_type'], name: 'idx_accounting_entries_entry_type' },
    { fields: ['entry_date'], name: 'idx_accounting_entries_entry_date' },
    { fields: ['reversal_of_id'], name: 'idx_accounting_entries_reversal_of_id' },
  ],
});

export = AccountingEntry;
