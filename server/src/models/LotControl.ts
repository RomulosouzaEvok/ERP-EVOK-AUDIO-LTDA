/**
 * Model: LotControl
 *
 * @module models/LotControl
 *
 * Registra lotes industriais de materia-prima, subconjuntos e produto acabado.
 * Mantem origem, saldo disponivel e status para rastreabilidade de compras,
 * producao, qualidade e expedicao sem depender de ERP anterior.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export type LotControlStatus = 'available' | 'reserved' | 'consumed' | 'blocked' | 'expired';

export interface LotControlAttributes {
  id: number;
  product_id: number;
  item_id?: string | null;
  supplier_id: number | null;
  purchase_id: number | null;
  production_order_id: number | null;
  lot_number: string;
  status: LotControlStatus;
  quantity_initial: number;
  quantity_available: number;
  manufactured_at: string | null;
  expires_at: string | null;
  received_at: string | null;
  created_by: number | null;
  notes: string | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const LotControl = sequelize.define('LotControl', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  product_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK -> products.id (legado)' },
  item_id: { type: DataTypes.UUID, allowNull: true, comment: 'FK -> items.id (Fase 4.6 expand-contract)' },
  supplier_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK -> suppliers.id quando o lote veio de compra' },
  purchase_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK -> purchase_orders.id quando o lote veio de recebimento' },
  production_order_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK -> production_orders.id quando o lote foi produzido internamente' },
  lot_number: { type: DataTypes.STRING(80), allowNull: false, comment: 'Codigo unico do lote por produto' },
  status: {
    type: DataTypes.ENUM('available', 'reserved', 'consumed', 'blocked', 'expired'),
    defaultValue: 'available',
    allowNull: false
  },
  quantity_initial: {
    type: DataTypes.DECIMAL(12, 4),
    allowNull: false,
    validate: { min: 0 },
    comment: 'Quantidade original recebida ou produzida'
  },
  quantity_available: {
    type: DataTypes.DECIMAL(12, 4),
    allowNull: false,
    validate: { min: 0 },
    comment: 'Saldo atual rastreavel do lote'
  },
  manufactured_at: { type: DataTypes.DATEONLY, allowNull: true },
  expires_at: { type: DataTypes.DATEONLY, allowNull: true },
  received_at: { type: DataTypes.DATEONLY, allowNull: true },
  created_by: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK -> users.id' },
  notes: { type: DataTypes.TEXT, allowNull: true }
}, {
  tableName: 'lot_controls',
  underscored: true,
  timestamps: true,
  indexes: [
    { unique: true, fields: ['product_id', 'lot_number'] },
    { fields: ['status'] },
    { fields: ['expires_at'] }
  ]
});

export = LotControl;
