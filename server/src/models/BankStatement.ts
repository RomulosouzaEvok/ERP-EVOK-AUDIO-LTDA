/**
 * 🏦 Model: BankStatement (Extrato Bancário Importado)
 *
 * @module models/BankStatement
 *
 * Um registro por arquivo `.ofx` importado na Conciliação Bancária v1
 * (`server/src/modules/financial/**`). `bank_name`/`account_number` e o
 * período (`period_start`/`period_end`) são meramente informativos,
 * extraídos do próprio OFX quando presentes — nunca usados para lógica de
 * negócio (ver `docs/governance/TODO.md`, gap "conciliação
 * bancária/CNAB"; CNAB fica fora desta v1).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface BankStatementAttributes {
  id: number;
  filename: string;
  bank_name: string | null;
  account_number: string | null;
  period_start: string | null;
  period_end: string | null;
  imported_by: number;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const BankStatement = sequelize.define('BankStatement', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  filename: { type: DataTypes.STRING(255), allowNull: false, comment: 'Nome original do arquivo .ofx enviado' },
  bank_name: { type: DataTypes.STRING(150), allowNull: true, comment: 'Deduzido do BANKID do OFX quando reconhecido — apenas informativo' },
  account_number: { type: DataTypes.STRING(60), allowNull: true, comment: 'ACCTID do OFX — apenas informativo' },
  period_start: { type: DataTypes.DATEONLY, allowNull: true, comment: 'DTSTART do OFX' },
  period_end: { type: DataTypes.DATEONLY, allowNull: true, comment: 'DTEND do OFX' },
  imported_by: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK → users.id (quem fez o upload)' },
}, {
  tableName: 'bank_statements',
  underscored: true,
  timestamps: true,
});

export = BankStatement;
