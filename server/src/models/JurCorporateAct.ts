/**
 * ⚖️ Model: JurCorporateAct (Ato Societário — módulo Jurídico)
 *
 * @module models/JurCorporateAct
 *
 * Tabela `jur_corporate_acts` (migration `20260808-000001`, RF-JUR-030).
 * Entidade própria da Secretaria/Governança (assembleia geral, reunião de
 * sócios, alteração contratual/estatutária, deliberação de diretoria,
 * outros) — SEM FK para contrato/caso. `status` é imutável depois de
 * `registered` (validado em `UpdateCorporateActUseCase`, não em CHECK de
 * banco, pois a transição depende de dois campos preenchidos juntos).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type CorporateActType = 'general_assembly' | 'partners_meeting' | 'bylaw_amendment' | 'board_resolution' | 'other';
type CorporateActStatus = 'draft' | 'registered';

interface JurCorporateActAttributes {
  id: number;
  act_type: CorporateActType;
  title: string;
  description: string | null;
  act_date: string;
  registration_protocol: string | null;
  registered_at: string | null;
  status: CorporateActStatus;
  document_file_path: string | null;
  created_by: number;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const JurCorporateAct = sequelize.define<any, JurCorporateActAttributes>('JurCorporateAct', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  act_type: {
    type: DataTypes.ENUM('general_assembly', 'partners_meeting', 'bylaw_amendment', 'board_resolution', 'other'),
    allowNull: false,
  },
  title: { type: DataTypes.STRING(200), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  act_date: { type: DataTypes.DATEONLY, allowNull: false },
  registration_protocol: { type: DataTypes.STRING(60), allowNull: true },
  registered_at: { type: DataTypes.DATEONLY, allowNull: true },
  status: { type: DataTypes.ENUM('draft', 'registered'), allowNull: false, defaultValue: 'draft' },
  document_file_path: { type: DataTypes.STRING(500), allowNull: true },
  created_by: { type: DataTypes.INTEGER, allowNull: false },
}, {
  tableName: 'jur_corporate_acts',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['status'] },
    { fields: ['act_type'] },
    { fields: ['act_date'] },
  ],
});

export = JurCorporateAct;
