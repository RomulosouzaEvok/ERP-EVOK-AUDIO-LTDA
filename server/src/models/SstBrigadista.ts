/**
 * 🦺 Model: SstBrigadista (Membro da brigada de incêndio/emergência)
 *
 * @module models/SstBrigadista
 *
 * Tabela `sst_brigadistas` (migration `20260806-000141`). `employee_id` é
 * UNIQUE — um funcionário só pode ter um registro de brigadista.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface SstBrigadistaAttributes {
  id: number;
  employee_id: number;
  data_formacao: string;
  validade_reciclagem: string | null;
  ativo: boolean;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const SstBrigadista = sequelize.define<any, SstBrigadistaAttributes>('SstBrigadista', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  employee_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  data_formacao: { type: DataTypes.DATEONLY, allowNull: false },
  validade_reciclagem: { type: DataTypes.DATEONLY, allowNull: true },
  ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
}, {
  tableName: 'sst_brigadistas',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['ativo'] },
    { fields: ['validade_reciclagem'] }
  ]
});

export = SstBrigadista;
