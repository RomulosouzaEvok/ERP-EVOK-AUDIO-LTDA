/**
 * 🔧 Model: ServiceOrder (Ordens de Serviço / Assistência Técnica)
 *
 * @module models/ServiceOrder
 *
 * Gerencia ordens de serviço para assistência técnica de produtos.
 * Controla status desde abertura até entrega.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface ServiceOrderAttributes {
  id: number;
  order_number: string;
  client_id: number;
  product_id: number | null;
  equipment_description: string | null;
  reported_issue: string | null;
  diagnosed_issue: string | null;
  service_performed: string | null;
  labor_cost: number;
  total_amount: number;
  status: 'open' | 'diagnosing' | 'in_progress' | 'waiting_parts' | 'completed' | 'delivered' | 'canceled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  entry_date: string;
  completion_date: string | null;
  delivery_date: string | null;
  technician_id: number | null;
  responsible_id: number | null;
  warranty_days: number;
  notes: string | null;
  created_by: number | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const ServiceOrder = sequelize.define('ServiceOrder', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  order_number: { type: DataTypes.STRING(20), allowNull: false, unique: true, comment: 'Nº da OS' },
  client_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK → clients.id' },
  product_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK → products.id' },
  equipment_description: { type: DataTypes.TEXT, allowNull: true },
  reported_issue: { type: DataTypes.TEXT, allowNull: true },
  diagnosed_issue: { type: DataTypes.TEXT, allowNull: true },
  service_performed: { type: DataTypes.TEXT, allowNull: true },
  labor_cost: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  total_amount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  status: { type: DataTypes.ENUM('open', 'diagnosing', 'in_progress', 'waiting_parts', 'completed', 'delivered', 'canceled'), defaultValue: 'open' },
  priority: { type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'), defaultValue: 'normal' },
  // NOT NULL no banco de proposito: toda OS tem data de entrada do
  // equipamento. `defaultValue` e aplicado no cliente pelo Sequelize, entao o
  // INSERT nunca omite (ver migration 20260810-000033, §"NAO afrouxadas").
  entry_date: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW, comment: 'Data de entrada do equipamento' },
  completion_date: { type: DataTypes.DATEONLY, allowNull: true },
  delivery_date: { type: DataTypes.DATEONLY, allowNull: true },
  technician_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK → users.id' },
  responsible_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK → users.id' },
  warranty_days: { type: DataTypes.INTEGER, defaultValue: 90 },
  notes: { type: DataTypes.TEXT, allowNull: true },
  created_by: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK → users.id' }
}, {
  tableName: 'service_orders',
  underscored: true,
  timestamps: true
});

export = ServiceOrder;
