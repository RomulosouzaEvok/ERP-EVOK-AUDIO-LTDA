/**
 * Model: SerialNumber
 *
 * @module models/SerialNumber
 *
 * Controla numeros de serie individuais vinculados a produto, lote, OP e venda.
 * Usado para rastreabilidade tecnica de produto acabado e subconjuntos seriados.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export type SerialNumberStatus = 'available' | 'reserved' | 'sold' | 'blocked' | 'scrapped';

export interface SerialNumberAttributes {
  id: number;
  product_id: number;
  lot_control_id: number | null;
  production_order_id: number | null;
  sale_id: number | null;
  serial_number: string;
  status: SerialNumberStatus;
  manufactured_at: string | null;
  sold_at: string | null;
  notes: string | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const SerialNumber = sequelize.define('SerialNumber', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  product_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK -> products.id' },
  lot_control_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK -> lot_controls.id' },
  production_order_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK -> production_orders.id' },
  sale_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK -> sales.id' },
  serial_number: { type: DataTypes.STRING(120), allowNull: false, unique: true },
  status: {
    type: DataTypes.ENUM('available', 'reserved', 'sold', 'blocked', 'scrapped'),
    defaultValue: 'available',
    allowNull: false
  },
  manufactured_at: { type: DataTypes.DATEONLY, allowNull: true },
  sold_at: { type: DataTypes.DATEONLY, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true }
}, {
  tableName: 'serial_numbers',
  underscored: true,
  timestamps: true,
  indexes: [
    { unique: true, fields: ['serial_number'] },
    { fields: ['product_id', 'status'] }
  ]
});

export = SerialNumber;
