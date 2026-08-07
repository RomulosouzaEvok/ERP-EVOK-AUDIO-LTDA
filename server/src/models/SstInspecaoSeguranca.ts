/**
 * 🦺 Model: SstInspecaoSeguranca (Inspeção de segurança com checklist)
 *
 * @module models/SstInspecaoSeguranca
 *
 * Tabela `sst_inspecoes_seguranca` (migration `20260806-000141`).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface SstInspecaoSegurancaAttributes {
  id: number;
  department_id: number;
  data: string;
  checklist_modelo: string | null;
  inspetor_id: number;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const SstInspecaoSeguranca = sequelize.define<any, SstInspecaoSegurancaAttributes>('SstInspecaoSeguranca', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  department_id: { type: DataTypes.INTEGER, allowNull: false },
  data: { type: DataTypes.DATEONLY, allowNull: false },
  checklist_modelo: { type: DataTypes.STRING(150), allowNull: true },
  inspetor_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK -> users.id' }
}, {
  tableName: 'sst_inspecoes_seguranca',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['department_id', 'data'] }
  ]
});

export = SstInspecaoSeguranca;
