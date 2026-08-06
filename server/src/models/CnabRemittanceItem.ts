/**
 * 🏦 Model: CnabRemittanceItem (Título Incluído em uma Remessa CNAB)
 *
 * @module models/CnabRemittanceItem
 *
 * Um registro por título (`AccountReceivable`) incluído em uma
 * `CnabRemittance`. `nosso_numero` é reservado de forma sequencial e única
 * (`CompanyBankingConfig.next_our_number`) e nunca reaproveitado — mesmo se
 * o título nunca vier a ser liquidado.
 *
 * `status`:
 * - `pending`: remessa gerada, aguardando o retorno do banco.
 * - `settled`: retorno processado com código de liquidação (`ProcessReturnFileUseCase`) — `accounts_receivable` já baixada.
 * - `error`: retorno processado com código de rejeição/erro do banco — título NÃO foi registrado/liquidado, requer ação manual.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface CnabRemittanceItemAttributes {
  id: number;
  remittance_id: number;
  receivable_id: number;
  nosso_numero: string;
  amount: number;
  due_date: string;
  status: 'pending' | 'settled' | 'error';
  settled_at: Date | null;
  error_description: string | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const CnabRemittanceItem = sequelize.define('CnabRemittanceItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  remittance_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK → cnab_remittances.id' },
  receivable_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK → accounts_receivable.id' },
  nosso_numero: { type: DataTypes.STRING(20), allowNull: false, comment: 'Identificador único do título reservado junto ao banco (CompanyBankingConfig.next_our_number)' },
  amount: { type: DataTypes.DECIMAL(18, 6), allowNull: false, comment: 'Valor do título no momento da geração da remessa' },
  due_date: { type: DataTypes.DATEONLY, allowNull: false },
  status: { type: DataTypes.ENUM('pending', 'settled', 'error'), allowNull: false, defaultValue: 'pending' },
  settled_at: { type: DataTypes.DATE, allowNull: true, comment: 'Quando o retorno confirmou a liquidação' },
  error_description: { type: DataTypes.STRING(255), allowNull: true, comment: 'Descrição da ocorrência de erro/rejeição do banco, quando status=error' },
}, {
  tableName: 'cnab_remittance_items',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['nosso_numero'], unique: true, name: 'uq_cnab_remittance_items_nosso_numero' },
    { fields: ['remittance_id'], name: 'idx_cnab_remittance_items_remittance_id' },
    { fields: ['receivable_id'], name: 'idx_cnab_remittance_items_receivable_id' },
    { fields: ['status'], name: 'idx_cnab_remittance_items_status' },
  ],
});

export = CnabRemittanceItem;
