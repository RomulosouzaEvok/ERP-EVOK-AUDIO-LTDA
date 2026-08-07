/**
 * 🦺 Model: SstExameComplementar (exame complementar vinculado a um ASO)
 *
 * @module models/SstExameComplementar
 *
 * Tabela `sst_exames_complementares` (migration `20260806-000134`). CASCADE
 * em `aso_id` — entidade de composição sem existência própria fora do ASO
 * pai.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface SstExameComplementarAttributes {
  id: number;
  aso_id: number;
  tipo_exame: string;
  data_realizacao: string;
  resultado_laudo_url: string | null;
  alterado: boolean;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const SstExameComplementar = sequelize.define<any, SstExameComplementarAttributes>('SstExameComplementar', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  aso_id: { type: DataTypes.INTEGER, allowNull: false },
  tipo_exame: { type: DataTypes.STRING(80), allowNull: false },
  data_realizacao: { type: DataTypes.DATEONLY, allowNull: false },
  resultado_laudo_url: DataTypes.STRING(255),
  alterado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
}, {
  tableName: 'sst_exames_complementares',
  underscored: true,
  timestamps: true,
  indexes: [{ fields: ['aso_id'] }]
});

export = SstExameComplementar;
