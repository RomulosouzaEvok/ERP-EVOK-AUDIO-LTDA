/**
 * Model: ImportProcess (Processo de Importacao / COMEX)
 *
 * @module models/ImportProcess
 *
 * Cabecalho de um processo de importacao (UC-19,
 * docs/projeto/04-USE_CASES.md). Cobre o acompanhamento do processo
 * (embarque, chegada, desembaraco) via `status` + as colunas de data
 * correspondentes, e os dados de cambio/despesas em BRL usados no rateio do
 * valor aduaneiro dos itens (`ImportProcessItem`).
 *
 * Ciclo de vida (`status`): `draft` -> `shipped` -> `arrived` ->
 * `customs_cleared` -> `received` | `cancelled` (cancelamento permitido em
 * qualquer estado anterior a `received`).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type ImportProcessStatus = 'draft' | 'shipped' | 'arrived' | 'customs_cleared' | 'received' | 'cancelled';

interface ImportProcessAttributes {
  id: number;
  process_number: string;
  supplier_id: number;
  status: ImportProcessStatus;
  fob_currency: string;
  exchange_rate: number;
  freight_value: number;
  insurance_value: number;
  other_expenses_value: number;
  shipped_at: string | null;
  arrived_at: string | null;
  customs_cleared_at: string | null;
  received_at: string | null;
  notes: string | null;
  created_by: number;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const ImportProcess = sequelize.define('ImportProcess', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  process_number: { type: DataTypes.STRING(60), allowNull: false, unique: true, comment: 'Numero do processo, formato IMP-<ano>-XXXX' },
  supplier_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK -> suppliers.id (fornecedor internacional)' },
  status: { type: DataTypes.ENUM('draft', 'shipped', 'arrived', 'customs_cleared', 'received', 'cancelled'), allowNull: false, defaultValue: 'draft' },
  fob_currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'USD', comment: 'Codigo ISO da moeda do valor FOB' },
  exchange_rate: { type: DataTypes.DECIMAL(18, 6), allowNull: false, defaultValue: 1, comment: 'Cotacao moeda estrangeira -> BRL' },
  freight_value: { type: DataTypes.DECIMAL(18, 6), allowNull: false, defaultValue: 0, comment: 'Frete internacional em BRL' },
  insurance_value: { type: DataTypes.DECIMAL(18, 6), allowNull: false, defaultValue: 0, comment: 'Seguro internacional em BRL' },
  other_expenses_value: { type: DataTypes.DECIMAL(18, 6), allowNull: false, defaultValue: 0, comment: 'Despesas aduaneiras adicionais em BRL' },
  shipped_at: { type: DataTypes.DATEONLY, allowNull: true },
  arrived_at: { type: DataTypes.DATEONLY, allowNull: true },
  customs_cleared_at: { type: DataTypes.DATEONLY, allowNull: true },
  received_at: { type: DataTypes.DATEONLY, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
  created_by: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK -> users.id (analista de comex que registrou o processo)' },
}, {
  tableName: 'import_processes',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['supplier_id'] },
    { fields: ['status'] },
    { fields: ['created_by'] },
  ],
});

export = ImportProcess;
