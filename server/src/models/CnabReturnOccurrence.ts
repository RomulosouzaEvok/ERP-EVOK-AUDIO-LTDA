/**
 * 🏦 Model: CnabReturnOccurrence (Ocorrência Individual de um Retorno CNAB)
 *
 * @module models/CnabReturnOccurrence
 *
 * Uma linha por ocorrência (par Segmento T + Segmento U) lida de um
 * `CnabReturnFile`. Usada tanto para aplicar a baixa em
 * `accounts_receivable` (quando `movement_code` é um código de liquidação)
 * quanto para dedup — reimportar o mesmo arquivo de retorno não duplica a
 * baixa (`ProcessReturnFileUseCase` verifica, antes de aplicar, se já existe
 * uma ocorrência com o mesmo `(remittance_item_id, movement_code,
 * occurrence_date, amount_paid)`).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface CnabReturnOccurrenceAttributes {
  id: number;
  return_file_id: number;
  remittance_item_id: number | null;
  nosso_numero: string;
  movement_code: string;
  movement_description: string | null;
  amount_paid: number;
  occurrence_date: string | null;
  applied: boolean;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const CnabReturnOccurrence = sequelize.define('CnabReturnOccurrence', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  return_file_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK → cnab_return_files.id' },
  remittance_item_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK → cnab_remittance_items.id (NULL se o nosso_numero do retorno não corresponder a nenhuma remessa gerada por este sistema)' },
  nosso_numero: { type: DataTypes.STRING(20), allowNull: false, comment: 'Nosso número lido do Segmento T (mesmo que remittance_item_id seja NULL)' },
  movement_code: { type: DataTypes.STRING(2), allowNull: false, comment: 'Código de movimento/ocorrência do banco (ex.: "06" = liquidação normal)' },
  movement_description: { type: DataTypes.STRING(100), allowNull: true },
  amount_paid: { type: DataTypes.DECIMAL(18, 6), allowNull: false, defaultValue: 0, comment: 'Valor pago pelo sacado (Segmento U) — CNAB usa centavos, convertido aqui para a unidade principal' },
  occurrence_date: { type: DataTypes.DATEONLY, allowNull: true, comment: 'Data da ocorrência no sacado (Segmento U)' },
  applied: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, comment: 'true = esta ocorrência efetivamente deu baixa em accounts_receivable (código de liquidação + título encontrado)' },
}, {
  tableName: 'cnab_return_occurrences',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['return_file_id'], name: 'idx_cnab_return_occurrences_return_file_id' },
    { fields: ['remittance_item_id'], name: 'idx_cnab_return_occurrences_remittance_item_id' },
    { fields: ['nosso_numero'], name: 'idx_cnab_return_occurrences_nosso_numero' },
  ],
});

export = CnabReturnOccurrence;
