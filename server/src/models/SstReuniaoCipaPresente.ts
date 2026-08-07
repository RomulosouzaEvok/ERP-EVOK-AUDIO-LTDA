/**
 * 🦺 Model: SstReuniaoCipaPresente (Presença de membro CIPA em reunião)
 *
 * @module models/SstReuniaoCipaPresente
 *
 * Tabela `sst_reuniao_cipa_presentes` (migration `20260806-000138`).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface SstReuniaoCipaPresenteAttributes {
  id: number;
  reuniao_id: number;
  membro_cipa_id: number;
  readonly createdAt?: Date;
}

const SstReuniaoCipaPresente = sequelize.define<any, SstReuniaoCipaPresenteAttributes>('SstReuniaoCipaPresente', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  reuniao_id: { type: DataTypes.INTEGER, allowNull: false },
  membro_cipa_id: { type: DataTypes.INTEGER, allowNull: false }
}, {
  tableName: 'sst_reuniao_cipa_presentes',
  underscored: true,
  timestamps: false,
  createdAt: 'created_at',
  updatedAt: false,
  indexes: [
    { fields: ['reuniao_id'] }
  ]
});

export = SstReuniaoCipaPresente;
