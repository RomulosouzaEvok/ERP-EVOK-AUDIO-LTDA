/**
 * 📒 Model: AccountingChartOfAccount (Plano de Contas — Contabilidade)
 *
 * @module models/AccountingChartOfAccount
 *
 * Cadastro hierárquico do Plano de Contas do módulo Contabilidade (subárea
 * CONT do departamento Financeiro — ver `docs/financeiro/02-CONTABILIDADE.md`).
 * Auto-relacionamento via `parent_id` forma a árvore (ex.: "1" ATIVO → "1.1"
 * Ativo Circulante → "1.1.1" Caixa e Equivalentes). Apenas contas "folha"
 * (`accept_entries = true`) podem receber lançamento direto em
 * `AccountingEntryItem.account_id` — contas sintéticas/cabeçalho
 * (`accept_entries = false`) existem só para agrupar o balancete/relatórios.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type AccountingAccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense' | 'cost';

interface AccountingChartOfAccountAttributes {
  id: number;
  code: string;
  name: string;
  account_type: AccountingAccountType;
  account_level: number;
  parent_id: number | null;
  accept_entries: boolean;
  active: boolean;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const AccountingChartOfAccount = sequelize.define('AccountingChartOfAccount', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  code: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  name: { type: DataTypes.STRING(200), allowNull: false },
  account_type: {
    type: DataTypes.ENUM('asset', 'liability', 'equity', 'revenue', 'expense', 'cost'),
    allowNull: false,
  },
  account_level: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  parent_id: { type: DataTypes.INTEGER, allowNull: true },
  accept_entries: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, {
  tableName: 'accounting_chart_of_accounts',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['code'], name: 'uq_accounting_chart_of_accounts_code', unique: true },
    { fields: ['parent_id'], name: 'idx_accounting_chart_of_accounts_parent_id' },
    { fields: ['account_type'], name: 'idx_accounting_chart_of_accounts_account_type' },
    { fields: ['active'], name: 'idx_accounting_chart_of_accounts_active' },
  ],
});

export = AccountingChartOfAccount;
