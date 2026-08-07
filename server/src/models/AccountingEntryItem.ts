/**
 * 📘 Model: AccountingEntryItem (Item de Lançamento Contábil — Contabilidade)
 *
 * @module models/AccountingEntryItem
 *
 * Linha de débito OU crédito de um `AccountingEntry` (partida dobrada). Por
 * linha, exatamente um de `debit`/`credit` é diferente de zero — nunca os
 * dois, nunca nenhum (validado em `CreateEntryUseCase`/`UpdateEntryUseCase`,
 * não no banco). `historical` é o "histórico" contábil da linha (texto
 * livre explicando a natureza do lançamento naquela conta).
 *
 * Regra de imutabilidade: itens de um lançamento com `status = 'posted'` (ou
 * `'reversed'`) não podem mais ser editados/removidos — aplicado na camada
 * de aplicação (`UpdateEntryUseCase`), não como constraint de banco.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface AccountingEntryItemAttributes {
  id: number;
  entry_id: number;
  account_id: number;
  cost_center_id: number | null;
  debit: number;
  credit: number;
  historical: string | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const AccountingEntryItem = sequelize.define('AccountingEntryItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  entry_id: { type: DataTypes.INTEGER, allowNull: false },
  account_id: { type: DataTypes.INTEGER, allowNull: false },
  cost_center_id: { type: DataTypes.INTEGER, allowNull: true },
  debit: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  credit: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  historical: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'accounting_entry_items',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['entry_id'], name: 'idx_accounting_entry_items_entry_id' },
    { fields: ['account_id'], name: 'idx_accounting_entry_items_account_id' },
    { fields: ['cost_center_id'], name: 'idx_accounting_entry_items_cost_center_id' },
  ],
});

export = AccountingEntryItem;
