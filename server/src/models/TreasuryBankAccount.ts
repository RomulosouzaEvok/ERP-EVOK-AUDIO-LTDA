/**
 * 🏦 Model: TreasuryBankAccount (Conta Bancária — Tesouraria)
 *
 * @module models/TreasuryBankAccount
 *
 * Cadastro de contas bancárias operacionais da empresa (corrente, poupança,
 * aplicação) do módulo Tesouraria (subárea TES do departamento Financeiro —
 * `docs/financeiro/03-TESOURARIA.md`), com saldo atual (`current_balance`)
 * mantido manualmente pela Tesouraria (não há reconciliação automática de
 * saldo aqui — isso é papel de `BankStatement`/`BankStatementEntry` em
 * `server/src/modules/financial/`, que este módulo não duplica).
 *
 * DECISÃO ARQUITETURAL: separada de `CompanyBankingConfig`
 * (`company_banking_config`), que é uma tabela singleton (1 linha) com os
 * dados bancários do CEDENTE usados apenas na geração de remessa/boleto
 * CNAB — não é um cadastro de múltiplas contas. Ver
 * `docs/financeiro/03-TESOURARIA.md` §Decisões Arquiteturais para o
 * detalhamento completo dessa decisão.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type TreasuryBankAccountType = 'corrente' | 'poupanca' | 'aplicacao';

interface TreasuryBankAccountAttributes {
  id: number;
  bank_name: string;
  agency: string;
  account_number: string;
  account_type: TreasuryBankAccountType;
  current_balance: number;
  manager_name: string | null;
  manager_phone: string | null;
  active: boolean;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const TreasuryBankAccount = sequelize.define('TreasuryBankAccount', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  bank_name: { type: DataTypes.STRING(100), allowNull: false },
  agency: { type: DataTypes.STRING(20), allowNull: false },
  account_number: { type: DataTypes.STRING(20), allowNull: false },
  account_type: {
    type: DataTypes.ENUM('corrente', 'poupanca', 'aplicacao'),
    allowNull: false,
  },
  current_balance: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  manager_name: { type: DataTypes.STRING(100), allowNull: true },
  manager_phone: { type: DataTypes.STRING(20), allowNull: true },
  active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, {
  tableName: 'treasury_bank_accounts',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['agency', 'account_number'], name: 'uq_treasury_bank_accounts_agency_account', unique: true },
    { fields: ['account_type'], name: 'idx_treasury_bank_accounts_account_type' },
    { fields: ['active'], name: 'idx_treasury_bank_accounts_active' },
  ],
});

export = TreasuryBankAccount;
