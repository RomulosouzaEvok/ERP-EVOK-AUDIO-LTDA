/**
 * 🦺 Model: SstDevolucaoEpi (Devolução de EPI reutilizável — insert-only)
 *
 * @module models/SstDevolucaoEpi
 *
 * Tabela `sst_devolucoes_epi` (migration `20260806-000131`). Nunca altera a
 * `SstEntregaEpi` original (RNF-SST-01) — a Ficha de EPI consolidada faz o
 * JOIN das duas tabelas na leitura.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface SstDevolucaoEpiAttributes {
  id: number;
  entrega_epi_id: number;
  data_devolucao: string;
  condicao: string;
  registrado_por: number;
  readonly createdAt?: Date;
}

const SstDevolucaoEpi = sequelize.define<any, SstDevolucaoEpiAttributes>('SstDevolucaoEpi', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  entrega_epi_id: { type: DataTypes.INTEGER, allowNull: false },
  data_devolucao: { type: DataTypes.DATEONLY, allowNull: false },
  condicao: { type: DataTypes.STRING(255), allowNull: false },
  registrado_por: { type: DataTypes.INTEGER, allowNull: false }
}, {
  tableName: 'sst_devolucoes_epi',
  underscored: true,
  timestamps: true,
  updatedAt: false,
  indexes: [{ fields: ['entrega_epi_id'] }]
});

export = SstDevolucaoEpi;
