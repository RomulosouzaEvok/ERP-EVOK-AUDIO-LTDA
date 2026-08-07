/**
 * 🦺 Model: SstMatrizEpi (Matriz função/setor × EPI — NR-6)
 *
 * @module models/SstMatrizEpi
 *
 * Tabela `sst_matriz_epi` (migration `20260806-000130`). Ao menos um de
 * `department_id`/`position` é obrigatório (CHECK de banco
 * `ck_sst_matriz_epi_alvo_definido`).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface SstMatrizEpiAttributes {
  id: number;
  department_id: number | null;
  position: string | null;
  tipo_epi_id: number;
  quantidade_padrao: string;
  observacao: string | null;
  ativo: boolean;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const SstMatrizEpi = sequelize.define<any, SstMatrizEpiAttributes>('SstMatrizEpi', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  department_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK -> departments.id (CASCADE)' },
  position: DataTypes.STRING(100),
  tipo_epi_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK -> sst_tipos_epi.id' },
  quantidade_padrao: { type: DataTypes.DECIMAL(18, 6), allowNull: false, defaultValue: 1 },
  observacao: DataTypes.TEXT,
  ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
}, {
  tableName: 'sst_matriz_epi',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['department_id'] },
    { fields: ['position'] },
    { fields: ['tipo_epi_id'] }
  ]
});

export = SstMatrizEpi;
