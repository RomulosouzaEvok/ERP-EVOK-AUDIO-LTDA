/**
 * 🦺 Model: SstInvestigacaoAcidente (Investigação/árvore de causas do acidente)
 *
 * @module models/SstInvestigacaoAcidente
 *
 * Tabela `sst_investigacoes_acidente` (migration `20260806-000135`). Um
 * acidente tem zero-ou-uma investigação (`acidente_id` UNIQUE).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface SstInvestigacaoAcidenteAttributes {
  id: number;
  acidente_id: number;
  causas_identificadas: string | null;
  participantes: string | null;
  evidencias_urls: string | null;
  concluida_em: Date | null;
  created_by: number;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const SstInvestigacaoAcidente = sequelize.define<any, SstInvestigacaoAcidenteAttributes>('SstInvestigacaoAcidente', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  acidente_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  causas_identificadas: DataTypes.TEXT,
  participantes: DataTypes.TEXT,
  evidencias_urls: DataTypes.TEXT,
  concluida_em: DataTypes.DATE,
  created_by: { type: DataTypes.INTEGER, allowNull: false }
}, {
  tableName: 'sst_investigacoes_acidente',
  underscored: true,
  timestamps: true
});

export = SstInvestigacaoAcidente;
