/**
 * 🦺 Model: SstMandatoCipa (Mandato da CIPA, NR-5/CF-88)
 *
 * @module models/SstMandatoCipa
 *
 * Tabela `sst_mandatos_cipa` (migration `20260806-000138`).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type MandatoCipaStatus = 'eleicao_em_curso' | 'vigente' | 'encerrado';

interface SstMandatoCipaAttributes {
  id: number;
  data_inicio: string;
  data_fim: string;
  titulares_empregador: number;
  titulares_empregados: number;
  suplentes_empregador: number;
  suplentes_empregados: number;
  status: MandatoCipaStatus;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const SstMandatoCipa = sequelize.define<any, SstMandatoCipaAttributes>('SstMandatoCipa', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  data_inicio: { type: DataTypes.DATEONLY, allowNull: false },
  data_fim: { type: DataTypes.DATEONLY, allowNull: false },
  titulares_empregador: { type: DataTypes.INTEGER, allowNull: false },
  titulares_empregados: { type: DataTypes.INTEGER, allowNull: false },
  suplentes_empregador: { type: DataTypes.INTEGER, allowNull: false },
  suplentes_empregados: { type: DataTypes.INTEGER, allowNull: false },
  status: { type: DataTypes.ENUM('eleicao_em_curso', 'vigente', 'encerrado'), allowNull: false, defaultValue: 'eleicao_em_curso' }
}, {
  tableName: 'sst_mandatos_cipa',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['status'] },
    { fields: ['data_inicio', 'data_fim'] }
  ]
});

export = SstMandatoCipa;
