/**
 * 🦺 Model: SstPlanoExames (PCMSO — plano de exames por função/GES, NR-7)
 *
 * @module models/SstPlanoExames
 *
 * Tabela `sst_planos_exames` (migration `20260806-000133`, FK `ges_id`
 * fechada em `000139`). Ao menos um de `position`/`ges_id` é obrigatório.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface SstPlanoExamesAttributes {
  id: number;
  position: string | null;
  ges_id: number | null;
  tipo_exame: string;
  periodicidade_meses: number;
  risco_exigente: string | null;
  ativo: boolean;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const SstPlanoExames = sequelize.define<any, SstPlanoExamesAttributes>('SstPlanoExames', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  position: DataTypes.STRING(100),
  ges_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK -> sst_ges.id' },
  tipo_exame: { type: DataTypes.STRING(80), allowNull: false },
  periodicidade_meses: { type: DataTypes.INTEGER, allowNull: false },
  risco_exigente: DataTypes.STRING(150),
  ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
}, {
  tableName: 'sst_planos_exames',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['position'] },
    { fields: ['ges_id'] }
  ]
});

export = SstPlanoExames;
