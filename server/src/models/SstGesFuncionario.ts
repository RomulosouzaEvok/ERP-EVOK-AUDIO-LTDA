/**
 * 🦺 Model: SstGesFuncionario (Vínculo funcionário × GES, base do S-2240)
 *
 * @module models/SstGesFuncionario
 *
 * Tabela `sst_ges_funcionarios` (migration `20260806-000139`). Cada
 * INSERT relevante é a origem do evento eSocial `S-2240` (RF-SST-040) —
 * geração é responsabilidade do use case, não de trigger.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface SstGesFuncionarioAttributes {
  id: number;
  ges_id: number;
  employee_id: number;
  inicio_exposicao: string;
  fim_exposicao: string | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const SstGesFuncionario = sequelize.define<any, SstGesFuncionarioAttributes>('SstGesFuncionario', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  ges_id: { type: DataTypes.INTEGER, allowNull: false },
  employee_id: { type: DataTypes.INTEGER, allowNull: false },
  inicio_exposicao: { type: DataTypes.DATEONLY, allowNull: false },
  fim_exposicao: { type: DataTypes.DATEONLY, allowNull: true }
}, {
  tableName: 'sst_ges_funcionarios',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['ges_id'] },
    { fields: ['employee_id'] }
  ]
});

export = SstGesFuncionario;
