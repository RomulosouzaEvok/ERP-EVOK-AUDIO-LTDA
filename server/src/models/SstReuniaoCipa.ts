/**
 * 🦺 Model: SstReuniaoCipa (Reunião ordinária/extraordinária da CIPA)
 *
 * @module models/SstReuniaoCipa
 *
 * Tabela `sst_reunioes_cipa` (migration `20260806-000138`). Ata obrigatória
 * (`ata_texto` ou `ata_arquivo_url`) para reunião `ordinaria` — BR-SST-023,
 * validado em app (use case), não em constraint de banco.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type ReuniaoCipaTipo = 'ordinaria' | 'extraordinaria';

interface SstReuniaoCipaAttributes {
  id: number;
  mandato_id: number;
  data: string;
  tipo: ReuniaoCipaTipo;
  pauta: string | null;
  ata_texto: string | null;
  ata_arquivo_url: string | null;
  created_by: number;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const SstReuniaoCipa = sequelize.define<any, SstReuniaoCipaAttributes>('SstReuniaoCipa', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  mandato_id: { type: DataTypes.INTEGER, allowNull: false },
  data: { type: DataTypes.DATEONLY, allowNull: false },
  tipo: { type: DataTypes.ENUM('ordinaria', 'extraordinaria'), allowNull: false },
  pauta: { type: DataTypes.TEXT, allowNull: true },
  ata_texto: { type: DataTypes.TEXT, allowNull: true },
  ata_arquivo_url: { type: DataTypes.STRING(255), allowNull: true },
  created_by: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK -> users.id' }
}, {
  tableName: 'sst_reunioes_cipa',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['mandato_id', 'data'] }
  ]
});

export = SstReuniaoCipa;
