/**
 * 🦺 Model: SstRiscoEpi (Associação N:N risco ocupacional × tipo de EPI recomendado)
 *
 * @module models/SstRiscoEpi
 *
 * Tabela `sst_risco_epis` (migration `20260806-000139`).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface SstRiscoEpiAttributes {
  id: number;
  risco_id: number;
  tipo_epi_id: number;
  readonly createdAt?: Date;
}

const SstRiscoEpi = sequelize.define<any, SstRiscoEpiAttributes>('SstRiscoEpi', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  risco_id: { type: DataTypes.INTEGER, allowNull: false },
  tipo_epi_id: { type: DataTypes.INTEGER, allowNull: false }
}, {
  tableName: 'sst_risco_epis',
  underscored: true,
  timestamps: false,
  createdAt: 'created_at',
  updatedAt: false
});

export = SstRiscoEpi;
