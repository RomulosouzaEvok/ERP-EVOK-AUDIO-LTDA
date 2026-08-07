/**
 * 🦺 Model: SstAcidenteTestemunha (join N:N acidente × funcionário testemunha)
 *
 * @module models/SstAcidenteTestemunha
 *
 * Tabela `sst_acidente_testemunhas` (migration `20260806-000135`).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface SstAcidenteTestemunhaAttributes {
  id: number;
  acidente_id: number;
  employee_id: number;
  readonly createdAt?: Date;
}

const SstAcidenteTestemunha = sequelize.define<any, SstAcidenteTestemunhaAttributes>('SstAcidenteTestemunha', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  acidente_id: { type: DataTypes.INTEGER, allowNull: false },
  employee_id: { type: DataTypes.INTEGER, allowNull: false }
}, {
  tableName: 'sst_acidente_testemunhas',
  underscored: true,
  timestamps: true,
  updatedAt: false,
  indexes: [
    { fields: ['acidente_id'] },
    { unique: true, fields: ['acidente_id', 'employee_id'] }
  ]
});

export = SstAcidenteTestemunha;
