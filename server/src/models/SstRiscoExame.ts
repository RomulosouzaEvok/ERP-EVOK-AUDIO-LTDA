/**
 * 🦺 Model: SstRiscoExame (Associação informativa risco × tipo de exame)
 *
 * @module models/SstRiscoExame
 *
 * Tabela `sst_risco_exames` (migration `20260806-000139`). `tipo_exame` é
 * texto livre (catálogo aberto, mesmo padrão de `sst_planos_exames.tipo_exame`).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface SstRiscoExameAttributes {
  id: number;
  risco_id: number;
  tipo_exame: string;
  readonly createdAt?: Date;
}

const SstRiscoExame = sequelize.define<any, SstRiscoExameAttributes>('SstRiscoExame', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  risco_id: { type: DataTypes.INTEGER, allowNull: false },
  tipo_exame: { type: DataTypes.STRING(80), allowNull: false }
}, {
  tableName: 'sst_risco_exames',
  underscored: true,
  timestamps: false,
  createdAt: 'created_at',
  updatedAt: false
});

export = SstRiscoExame;
