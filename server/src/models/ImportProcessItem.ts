/**
 * Model: ImportProcessItem (Item do Processo de Importacao / COMEX)
 *
 * @module models/ImportProcessItem
 *
 * Item importado dentro de um `ImportProcess` (UC-19). Guarda o valor FOB
 * unitario (moeda estrangeira) e as aliquotas de II/IPI/PIS/COFINS/ICMS
 * informadas manualmente pelo Analista de Comex (sem integracao
 * Siscomex/NCM — fora do escopo do UC-19), alem dos valores de tributo e do
 * custo unitario nacionalizado final, calculados por
 * `modules/comex/application/use-cases/importTaxCalculator`.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface ImportProcessItemAttributes {
  id: number;
  import_process_id: number;
  item_id: string;
  quantity: number;
  fob_unit_price: number;
  ii_rate: number;
  ipi_rate: number;
  pis_rate: number;
  cofins_rate: number;
  icms_rate: number;
  customs_value: number | null;
  ii_value: number | null;
  ipi_value: number | null;
  pis_value: number | null;
  cofins_value: number | null;
  icms_value: number | null;
  nationalized_unit_cost: number | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const ImportProcessItem = sequelize.define('ImportProcessItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  import_process_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK -> import_processes.id' },
  item_id: { type: DataTypes.UUID, allowNull: false, comment: 'FK -> items.id' },
  quantity: { type: DataTypes.DECIMAL(18, 6), allowNull: false },
  fob_unit_price: { type: DataTypes.DECIMAL(18, 6), allowNull: false, comment: 'Preco unitario FOB, na moeda estrangeira do processo' },
  ii_rate: { type: DataTypes.DECIMAL(7, 4), allowNull: false, defaultValue: 0, comment: 'Aliquota do II, percentual' },
  ipi_rate: { type: DataTypes.DECIMAL(7, 4), allowNull: false, defaultValue: 0, comment: 'Aliquota do IPI, percentual' },
  pis_rate: { type: DataTypes.DECIMAL(7, 4), allowNull: false, defaultValue: 0, comment: 'Aliquota do PIS-Importacao, percentual' },
  cofins_rate: { type: DataTypes.DECIMAL(7, 4), allowNull: false, defaultValue: 0, comment: 'Aliquota da COFINS-Importacao, percentual' },
  icms_rate: { type: DataTypes.DECIMAL(7, 4), allowNull: false, defaultValue: 0, comment: 'Aliquota do ICMS, percentual' },
  customs_value: { type: DataTypes.DECIMAL(18, 6), allowNull: true, comment: 'Valor aduaneiro rateado (calculado)' },
  ii_value: { type: DataTypes.DECIMAL(18, 6), allowNull: true },
  ipi_value: { type: DataTypes.DECIMAL(18, 6), allowNull: true },
  pis_value: { type: DataTypes.DECIMAL(18, 6), allowNull: true },
  cofins_value: { type: DataTypes.DECIMAL(18, 6), allowNull: true },
  icms_value: { type: DataTypes.DECIMAL(18, 6), allowNull: true },
  nationalized_unit_cost: { type: DataTypes.DECIMAL(18, 6), allowNull: true, comment: 'Custo unitario nacionalizado final' },
}, {
  tableName: 'import_process_items',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['import_process_id'] },
    { fields: ['item_id'] },
  ],
});

export = ImportProcessItem;
