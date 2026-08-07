/**
 * 🦺 Model: SstRegistroDds (Diálogo Diário/Semanal de Segurança)
 *
 * @module models/SstRegistroDds
 *
 * Tabela `sst_registros_dds` (migration `20260806-000141`). `turno` usa o
 * mesmo ENUM de `employees.shift` para consistência.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type DdsTurno = 'morning' | 'afternoon' | 'night' | 'commercial' | 'rotating';

interface SstRegistroDdsAttributes {
  id: number;
  data: string;
  department_id: number;
  turno: DdsTurno | null;
  tema: string;
  condutor_id: number;
  readonly createdAt?: Date;
}

const SstRegistroDds = sequelize.define<any, SstRegistroDdsAttributes>('SstRegistroDds', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  data: { type: DataTypes.DATEONLY, allowNull: false },
  department_id: { type: DataTypes.INTEGER, allowNull: false },
  turno: { type: DataTypes.ENUM('morning', 'afternoon', 'night', 'commercial', 'rotating'), allowNull: true },
  tema: { type: DataTypes.STRING(200), allowNull: false },
  condutor_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK -> employees.id' }
}, {
  tableName: 'sst_registros_dds',
  underscored: true,
  timestamps: false,
  createdAt: 'created_at',
  updatedAt: false,
  indexes: [
    { fields: ['department_id', 'data'] }
  ]
});

export = SstRegistroDds;
