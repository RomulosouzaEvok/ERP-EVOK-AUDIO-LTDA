/**
 * 🦺 Model: SstPermissaoTrabalho (Permissão de Trabalho — PT)
 *
 * @module models/SstPermissaoTrabalho
 *
 * Tabela `sst_permissoes_trabalho` (migration `20260806-000141`).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type PermissaoTrabalhoStatus = 'emitida' | 'encerrada' | 'cancelada';

interface SstPermissaoTrabalhoAttributes {
  id: number;
  atividade: string;
  tipo_risco: string;
  department_id: number;
  requisitos_verificados: string | null;
  autorizante_id: number;
  inicio_validade: Date;
  fim_validade: Date;
  status: PermissaoTrabalhoStatus;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const SstPermissaoTrabalho = sequelize.define<any, SstPermissaoTrabalhoAttributes>('SstPermissaoTrabalho', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  atividade: { type: DataTypes.STRING(200), allowNull: false },
  tipo_risco: { type: DataTypes.STRING(100), allowNull: false },
  department_id: { type: DataTypes.INTEGER, allowNull: false },
  requisitos_verificados: { type: DataTypes.TEXT, allowNull: true },
  autorizante_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK -> users.id' },
  inicio_validade: { type: DataTypes.DATE, allowNull: false },
  fim_validade: { type: DataTypes.DATE, allowNull: false },
  status: { type: DataTypes.ENUM('emitida', 'encerrada', 'cancelada'), allowNull: false, defaultValue: 'emitida' }
}, {
  tableName: 'sst_permissoes_trabalho',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['status', 'fim_validade'] }
  ]
});

export = SstPermissaoTrabalho;
