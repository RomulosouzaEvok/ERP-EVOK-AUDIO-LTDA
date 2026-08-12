/**
 * 📝 Model: MeetingMinute (Ata de Reunião — Diretoria)
 *
 * @module models/MeetingMinute
 *
 * Registro de governança **imutável após criação**: o módulo
 * (`server/src/modules/directorate/`) propositalmente não expõe rota de
 * UPDATE/DELETE de conteúdo — se a ata está errada, registra-se uma ata
 * retificadora nova (mesmo princípio de atas societárias reais). Nada nesta
 * camada impede um `UPDATE` SQL direto (não há trigger de banco); a garantia
 * vive na ausência da rota HTTP, mesmo desenho de `AuditLog` neste projeto.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type MeetingType = 'directors' | 'commercial' | 'industrial' | 'financial' | 'board' | 'general';

interface MeetingMinuteAttributes {
  id: number;
  meeting_date: string;
  meeting_type: MeetingType;
  title: string;
  participants: string | null;
  summary: string | null;
  decisions: unknown[];
  action_items: unknown[];
  file_path: string | null;
  created_by: number;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const MeetingMinute = sequelize.define(
  'MeetingMinute',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    meeting_date: { type: DataTypes.DATEONLY, allowNull: false },
    meeting_type: {
      type: DataTypes.ENUM('directors', 'commercial', 'industrial', 'financial', 'board', 'general'),
      allowNull: false,
    },
    title: { type: DataTypes.STRING(200), allowNull: false },
    participants: { type: DataTypes.TEXT, allowNull: true },
    summary: { type: DataTypes.TEXT, allowNull: true },
    decisions: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    action_items: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    file_path: { type: DataTypes.STRING(500), allowNull: true },
    created_by: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK -> users.id' },
  },
  {
    tableName: 'meeting_minutes',
    underscored: true,
    timestamps: true,
    indexes: [
      { fields: ['meeting_date'] },
      { fields: ['meeting_type'] },
    ],
  },
);

export = MeetingMinute;
