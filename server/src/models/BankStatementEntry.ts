/**
 * 🏦 Model: BankStatementEntry (Lançamento de Extrato Bancário)
 *
 * @module models/BankStatementEntry
 *
 * Cada `<STMTTRN>` de um `BankStatement` importado. `amount` é assinado
 * (negativo = saída/débito, positivo = entrada/crédito). `fitid` é o
 * identificador do banco para o lançamento (ou um id sintético
 * determinístico quando o OFX não o informa) — usado para dedup na
 * reimportação do mesmo arquivo (ver
 * `server/src/modules/financial/infrastructure/ofx/parseOfx.ts`).
 *
 * No máximo um dos dois vínculos (`matched_payable_id` /
 * `matched_receivable_id`) pode estar preenchido — reforçado pelo CHECK
 * `chk_bank_statement_entries_single_match` (migration
 * `20260806-000070-create-bank-statements.cjs`) e pela regra de negócio do
 * `MatchEntryUseCase` (XOR obrigatório).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface BankStatementEntryAttributes {
  id: number;
  statement_id: number;
  entry_date: string;
  amount: number;
  description: string | null;
  fitid: string;
  status: 'pending' | 'matched' | 'ignored';
  matched_payable_id: number | null;
  matched_receivable_id: number | null;
  matched_by: number | null;
  matched_at: Date | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const BankStatementEntry = sequelize.define('BankStatementEntry', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  statement_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK → bank_statements.id' },
  entry_date: { type: DataTypes.DATEONLY, allowNull: false, comment: 'DTPOSTED do <STMTTRN>' },
  amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, comment: 'TRNAMT com sinal (negativo = saida, positivo = entrada)' },
  description: { type: DataTypes.STRING(255), allowNull: true, comment: 'MEMO/NAME do <STMTTRN>' },
  fitid: { type: DataTypes.STRING(100), allowNull: false, comment: 'FITID do banco (ou sintetico deterministico) — dedup na reimportacao' },
  status: { type: DataTypes.ENUM('pending', 'matched', 'ignored'), allowNull: false, defaultValue: 'pending' },
  matched_payable_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK → accounts_payable.id (XOR com matched_receivable_id)' },
  matched_receivable_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK → accounts_receivable.id (XOR com matched_payable_id)' },
  matched_by: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK → users.id (quem confirmou a conciliacao)' },
  matched_at: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'bank_statement_entries',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['statement_id', 'fitid'], unique: true, name: 'uq_bank_statement_entries_statement_fitid' },
    { fields: ['fitid'], name: 'idx_bank_statement_entries_fitid' },
    { fields: ['status'], name: 'idx_bank_statement_entries_status' },
  ],
});

export = BankStatementEntry;
