/**
 * 🦺 Model: SstGes (Grupo de Exposição Similar, NR-1)
 *
 * @module models/SstGes
 *
 * Tabela `sst_ges` (migration `20260806-000139`).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface SstGesAttributes {
  id: number;
  nome: string;
  descricao: string | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const SstGes = sequelize.define<any, SstGesAttributes>('SstGes', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nome: { type: DataTypes.STRING(150), allowNull: false },
  descricao: { type: DataTypes.TEXT, allowNull: true }
}, {
  tableName: 'sst_ges',
  underscored: true,
  timestamps: true
});

export = SstGes;
