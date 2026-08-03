import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export interface PurchaseRequisitionItemAttributes {
  id: number;
  requisition_id: number;
  item_id: string;
  quantity: number;
  unit: string | null;
  required_date: string | null;
  suggested_supplier_id: number | null;
  unit_price_estimated: number | null;
  status: 'pending' | 'ordered' | 'canceled';
  notes: string | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const PurchaseRequisitionItem = sequelize.define('PurchaseRequisitionItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  requisition_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK -> purchase_requisitions.id' },
  item_id: { type: DataTypes.UUID, allowNull: false, comment: 'FK -> items.id' },
  quantity: { type: DataTypes.DECIMAL(18, 6), allowNull: false, comment: 'Quantidade requisitada' },
  unit: { type: DataTypes.STRING(12), allowNull: true, comment: 'Unidade de compra' },
  required_date: { type: DataTypes.DATEONLY, allowNull: true, comment: 'Data de necessidade' },
  suggested_supplier_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK -> suppliers.id' },
  unit_price_estimated: { type: DataTypes.DECIMAL(14, 2), allowNull: true, comment: 'Preco estimado unitario' },
  status: { type: DataTypes.ENUM('pending', 'ordered', 'canceled'), allowNull: false, defaultValue: 'pending' },
  notes: { type: DataTypes.TEXT, allowNull: true }
}, {
  tableName: 'purchase_requisition_items',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['requisition_id'] },
    { fields: ['item_id'] },
    { fields: ['status'] },
  ],
});

export = PurchaseRequisitionItem;

