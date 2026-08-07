/**
 * 💻 Model: ItTicketComment (Comentário/andamento de Chamado de TI)
 *
 * @module models/ItTicketComment
 *
 * Tabela `it_ticket_comments` (migration `20260807-000151`). Andamento do
 * chamado (RF-TI-014). `is_internal=true` = nota visível apenas para quem
 * tem o módulo `ti` — enforcement de leitura é feito no use case
 * (`GetTicketByIdUseCase`/`ListTicketCommentsUseCase`), a coluna só guarda
 * o flag.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface ItTicketCommentAttributes {
  id: number;
  ticket_id: number;
  author_id: number;
  body: string;
  is_internal: boolean;
  readonly createdAt?: Date;
}

const ItTicketComment = sequelize.define<any, ItTicketCommentAttributes>('ItTicketComment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  ticket_id: { type: DataTypes.INTEGER, allowNull: false },
  author_id: { type: DataTypes.INTEGER, allowNull: false },
  body: { type: DataTypes.TEXT, allowNull: false },
  is_internal: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, {
  tableName: 'it_ticket_comments',
  underscored: true,
  timestamps: false,
  createdAt: 'created_at',
  updatedAt: false,
  indexes: [{ fields: ['ticket_id'] }],
});

export = ItTicketComment;
