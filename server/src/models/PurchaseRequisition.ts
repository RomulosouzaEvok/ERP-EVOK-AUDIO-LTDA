import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export interface PurchaseRequisitionAttributes {
  id: number;
  requisition_number: string;
  requester_id: number;
  department_id: number | null;
  production_order_id: number | null;
  engineering_project_id: number | null;
  request_date: string;
  priority: 'normal' | 'urgent' | 'emergency';
  status: 'draft' | 'pending' | 'approved' | 'ordered' | 'partial' | 'received' | 'canceled';
  origin: string;
  approved_by: number | null;
  approval_date: string | null;
  notes: string | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const PurchaseRequisition = sequelize.define('PurchaseRequisition', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  requisition_number: { type: DataTypes.STRING(60), allowNull: false, unique: true, comment: 'Numero da requisicao de compra' },
  requester_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK -> users.id' },
  department_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK -> departments.id' },
  production_order_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK -> production_orders.id' },
  engineering_project_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK -> engineering_projects.id (opcional) — vinculo da requisicao de amostra ao projeto de P&D (UC-39, Bloco 2)' },
  request_date: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
  priority: { type: DataTypes.ENUM('normal', 'urgent', 'emergency'), allowNull: false, defaultValue: 'normal' },
  status: { type: DataTypes.ENUM('draft', 'pending', 'approved', 'ordered', 'partial', 'received', 'canceled'), allowNull: false, defaultValue: 'pending' },
  origin: { type: DataTypes.STRING(80), allowNull: false, defaultValue: 'manual', comment: 'manual, mrp, engenharia_amostra (UC-39), etc.' },
  approved_by: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK -> users.id' },
  approval_date: { type: DataTypes.DATEONLY, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true }
}, {
  tableName: 'purchase_requisitions',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['requester_id'] },
    { fields: ['status'] },
    { fields: ['request_date'] },
  ],
});

export = PurchaseRequisition;

