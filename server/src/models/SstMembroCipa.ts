/**
 * 🦺 Model: SstMembroCipa (Membro eleito/designado da CIPA)
 *
 * @module models/SstMembroCipa
 *
 * Tabela `sst_membros_cipa` (migration `20260806-000138`, FK
 * `treinamento_cipa_id` fechada em `000140`). `estabilidade_fim` é
 * persistida na criação (`mandato.data_fim + 1 ano`), nunca recalculada
 * por leitura — decisão fechada, `BLOCO_1_SST_MODELO_DADOS.md` §6.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type MembroCipaOrigem = 'eleito' | 'designado';
type MembroCipaPapel = 'presidente' | 'vice_presidente' | 'secretario' | 'titular' | 'suplente';

interface SstMembroCipaAttributes {
  id: number;
  mandato_id: number;
  employee_id: number;
  origem: MembroCipaOrigem;
  papel: MembroCipaPapel;
  votos_recebidos: number | null;
  estabilidade_inicio: string | null;
  estabilidade_fim: string | null;
  treinamento_cipa_id: number | null;
  posse_confirmada_em: Date | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const SstMembroCipa = sequelize.define<any, SstMembroCipaAttributes>('SstMembroCipa', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  mandato_id: { type: DataTypes.INTEGER, allowNull: false },
  employee_id: { type: DataTypes.INTEGER, allowNull: false },
  origem: { type: DataTypes.ENUM('eleito', 'designado'), allowNull: false },
  papel: { type: DataTypes.ENUM('presidente', 'vice_presidente', 'secretario', 'titular', 'suplente'), allowNull: false },
  votos_recebidos: { type: DataTypes.INTEGER, allowNull: true },
  estabilidade_inicio: { type: DataTypes.DATEONLY, allowNull: true },
  estabilidade_fim: { type: DataTypes.DATEONLY, allowNull: true },
  treinamento_cipa_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK -> sst_treinamentos.id' },
  posse_confirmada_em: { type: DataTypes.DATE, allowNull: true }
}, {
  tableName: 'sst_membros_cipa',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['mandato_id'] },
    { fields: ['employee_id'] },
    { fields: ['estabilidade_fim'] }
  ]
});

export = SstMembroCipa;
