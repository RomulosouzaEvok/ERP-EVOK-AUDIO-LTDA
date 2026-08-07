/**
 * 🦺 Model: SstDdsPresenca (Presença de funcionário num registro de DDS)
 *
 * @module models/SstDdsPresenca
 *
 * Tabela `sst_dds_presencas` (migration `20260806-000141`).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface SstDdsPresencaAttributes {
  id: number;
  registro_dds_id: number;
  employee_id: number;
  readonly createdAt?: Date;
}

const SstDdsPresenca = sequelize.define<any, SstDdsPresencaAttributes>('SstDdsPresenca', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  registro_dds_id: { type: DataTypes.INTEGER, allowNull: false },
  employee_id: { type: DataTypes.INTEGER, allowNull: false }
}, {
  tableName: 'sst_dds_presencas',
  underscored: true,
  timestamps: false,
  createdAt: 'created_at',
  updatedAt: false
});

export = SstDdsPresenca;
