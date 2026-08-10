/**
 * Model: ProductionOrderReservation (reserva de material por ordem de producao)
 *
 * @module models/ProductionOrderReservation
 *
 * Fonte da verdade da reserva de material (gap G3 da auditoria da cadeia do
 * produto, 2026-08-09). Cada linha amarra **uma OP** a **um produto** e a
 * quantidade que aquela OP — e somente ela — tem direito de liberar e
 * consumir.
 *
 * Antes desta tabela a reserva era um contador global em
 * `products.reserved_quantity`, sem dono: qualquer OP conseguia liberar o
 * material reservado por outra (canibalizacao). Aquele campo continua
 * existindo, mas rebaixado a **cache derivado** — vale sempre
 * `SUM(quantity - quantity_released)` das reservas `active` do produto, e e
 * recalculado na mesma transacao por `services/inventoryService`.
 *
 * Escopo: apenas ordens de producao. Vendas nao reservam estoque neste ERP
 * (consomem direto). Ver o cabecalho da migration
 * `20260809-000026-create-production-order-reservations.cjs`.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface ProductionOrderReservationAttributes {
  id: number;
  production_order_id: number;
  product_id: number;
  /** Quantidade originalmente reservada (imutavel apos a criacao). */
  quantity: number;
  /** Quantidade ja liberada. Saldo vivo = `quantity - quantity_released`. */
  quantity_released: number;
  status: 'active' | 'released';
  released_at: Date | null;
  created_by: number | null;
  notes: string | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const ProductionOrderReservation = sequelize.define('ProductionOrderReservation', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  production_order_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK -> production_orders.id dona da reserva' },
  product_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK -> products.id reservado' },
  quantity: { type: DataTypes.DECIMAL(18, 6), allowNull: false, validate: { min: 0.000001 } },
  quantity_released: { type: DataTypes.DECIMAL(18, 6), allowNull: false, defaultValue: 0 },
  status: { type: DataTypes.ENUM('active', 'released'), allowNull: false, defaultValue: 'active' },
  released_at: { type: DataTypes.DATE, allowNull: true },
  created_by: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK -> users.id que liberou a OP e criou a reserva' },
  notes: { type: DataTypes.TEXT, allowNull: true }
}, {
  tableName: 'production_order_reservations',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['production_order_id'] },
    { fields: ['product_id'] }
  ]
});

export = ProductionOrderReservation;
