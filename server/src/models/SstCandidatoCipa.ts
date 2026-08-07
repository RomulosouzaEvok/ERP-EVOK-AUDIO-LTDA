/**
 * 🦺 Model: SstCandidatoCipa (Candidato inscrito num processo eleitoral da CIPA)
 *
 * @module models/SstCandidatoCipa
 *
 * Tabela `sst_candidatos_cipa` (migration `20260806-000138`).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface SstCandidatoCipaAttributes {
  id: number;
  processo_eleitoral_id: number;
  employee_id: number;
  votos: number;
  eleito: boolean;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const SstCandidatoCipa = sequelize.define<any, SstCandidatoCipaAttributes>('SstCandidatoCipa', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  processo_eleitoral_id: { type: DataTypes.INTEGER, allowNull: false },
  employee_id: { type: DataTypes.INTEGER, allowNull: false },
  votos: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  eleito: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
}, {
  tableName: 'sst_candidatos_cipa',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['processo_eleitoral_id'] }
  ]
});

export = SstCandidatoCipa;
