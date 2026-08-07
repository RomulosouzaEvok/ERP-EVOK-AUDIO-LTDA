/**
 * 💻 Model: ItTicketCategory (Categoria de Chamado de TI)
 *
 * @module models/ItTicketCategory
 *
 * Tabela `it_ticket_categories` (migration `20260807-000150`). Catálogo
 * leve e editável sem deploy (RF-TI-001). Seed inicial (hardware, software,
 * rede, e-mail, sistema ERP, telefonia, acesso, outros) é responsabilidade
 * do bootstrap de banco (`server/src/scripts/seed*`), não desta migration.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

interface ItTicketCategoryAttributes {
  id: number;
  name: string;
  description: string | null;
  default_priority: TicketPriority;
  active: boolean;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const ItTicketCategory = sequelize.define<any, ItTicketCategoryAttributes>('ItTicketCategory', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  description: DataTypes.TEXT,
  default_priority: { type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'), allowNull: false, defaultValue: 'medium' },
  active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, {
  tableName: 'it_ticket_categories',
  underscored: true,
  timestamps: true,
});

export = ItTicketCategory;
