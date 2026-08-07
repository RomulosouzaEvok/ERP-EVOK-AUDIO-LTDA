/**
 * 🦺 Model: SstProcessoEleitoralCipa (Processo eleitoral da CIPA)
 *
 * @module models/SstProcessoEleitoralCipa
 *
 * Tabela `sst_processos_eleitorais_cipa` (migration `20260806-000138`).
 * `mandato_id` é UNIQUE — um processo eleitoral por mandato.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface SstProcessoEleitoralCipaAttributes {
  id: number;
  mandato_id: number;
  data_edital: string | null;
  data_inicio_inscricoes: string | null;
  data_fim_inscricoes: string | null;
  data_votacao: string | null;
  total_votantes: number | null;
  atas_urls: string | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const SstProcessoEleitoralCipa = sequelize.define<any, SstProcessoEleitoralCipaAttributes>('SstProcessoEleitoralCipa', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  mandato_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  data_edital: { type: DataTypes.DATEONLY, allowNull: true },
  data_inicio_inscricoes: { type: DataTypes.DATEONLY, allowNull: true },
  data_fim_inscricoes: { type: DataTypes.DATEONLY, allowNull: true },
  data_votacao: { type: DataTypes.DATEONLY, allowNull: true },
  total_votantes: { type: DataTypes.INTEGER, allowNull: true },
  atas_urls: { type: DataTypes.TEXT, allowNull: true }
}, {
  tableName: 'sst_processos_eleitorais_cipa',
  underscored: true,
  timestamps: true
});

export = SstProcessoEleitoralCipa;
