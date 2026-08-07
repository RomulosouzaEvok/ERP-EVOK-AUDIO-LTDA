/**
 * 🧑‍🤝‍🧑 Model: FacilityVisitor (Cadastro de Visitante — Facilities)
 *
 * @module models/FacilityVisitor
 *
 * Tabela `facility_visitors` (migration `20260807-000298`). Cadastro
 * mínimo de visitante (LGPD Art. 6º — minimização de dado, RF-FAC-047).
 * `document` mascarado em listagem — enforcement de aplicação (mapper),
 * não do model.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface FacilityVisitorAttributes {
  id: number;
  name: string;
  document: string;
  company: string | null;
  phone: string | null;
  photo_path: string | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const FacilityVisitor = sequelize.define<any, FacilityVisitorAttributes>('FacilityVisitor', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(150), allowNull: false },
  document: { type: DataTypes.STRING(30), allowNull: false },
  company: { type: DataTypes.STRING(150), allowNull: true },
  phone: { type: DataTypes.STRING(20), allowNull: true },
  photo_path: { type: DataTypes.STRING(500), allowNull: true },
}, {
  tableName: 'facility_visitors',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['document'], name: 'idx_facility_visitors_document' },
  ],
});

export = FacilityVisitor;
