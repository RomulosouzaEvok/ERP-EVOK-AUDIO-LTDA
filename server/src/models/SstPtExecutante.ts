/**
 * 🦺 Model: SstPtExecutante (Executante vinculado a uma Permissão de Trabalho)
 *
 * @module models/SstPtExecutante
 *
 * Tabela `sst_pt_executantes` (migration `20260806-000141`).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface SstPtExecutanteAttributes {
  id: number;
  permissao_trabalho_id: number;
  employee_id: number;
  readonly createdAt?: Date;
}

const SstPtExecutante = sequelize.define<any, SstPtExecutanteAttributes>('SstPtExecutante', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  permissao_trabalho_id: { type: DataTypes.INTEGER, allowNull: false },
  employee_id: { type: DataTypes.INTEGER, allowNull: false }
}, {
  tableName: 'sst_pt_executantes',
  underscored: true,
  timestamps: false,
  createdAt: 'created_at',
  updatedAt: false
});

export = SstPtExecutante;
