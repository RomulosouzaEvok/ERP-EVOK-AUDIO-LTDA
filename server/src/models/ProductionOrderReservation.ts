/**
 * Model: ProductionOrderReservation (reserva de estoque por documento dono)
 *
 * @module models/ProductionOrderReservation
 *
 * Fonte da verdade da reserva de estoque (gap G3 da auditoria da cadeia do
 * produto, 2026-08-09). Cada linha amarra **um documento dono** a **um
 * produto** e a quantidade que aquele documento — e somente ele — tem
 * direito de liberar e consumir.
 *
 * Antes desta tabela a reserva era um contador global em
 * `products.reserved_quantity`, sem dono: qualquer OP conseguia liberar o
 * material reservado por outra (canibalizacao). Aquele campo continua
 * existindo, mas rebaixado a **cache derivado** — vale sempre
 * `SUM(quantity - quantity_released)` das reservas `active` do produto
 * (somando OP e venda), e e recalculado na mesma transacao por
 * `services/inventoryService`.
 *
 * ## Dois donos possiveis (gap G9, 2026-08-10)
 *
 * O escopo original era so ordem de producao — vendas consumiam estoque
 * direto na confirmacao do pedido. O gap G9 moveu a baixa da confirmacao
 * para a autorizacao da NF-e (Ajuste SINIEF 07/05, clausula 9a §1o: a
 * mercadoria so circula depois da autorizacao de uso), e a confirmacao
 * passou a **reservar**. Por isso a tabela ganhou `sale_id` e
 * `production_order_id` virou nullable, com CHECK de **exatamente um dono**
 * no banco (`chk_stock_reservations_exactly_one_owner`).
 *
 * O nome da tabela (`production_order_reservations`) ficou historico e nao
 * foi renomeado de proposito: renomear tabela num banco que ja apresenta
 * drift em relacao as migrations e risco desnecessario para um ganho
 * cosmetico. Trate-a como "reserva de estoque", nao como "reserva de OP".
 *
 * Ver os cabecalhos das migrations
 * `20260809-000026-create-production-order-reservations.cjs` (G3) e
 * `20260810-000030-generalize-stock-reservations-for-sales-g9.cjs` (G9).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface ProductionOrderReservationAttributes {
  id: number;
  /** OP dona da reserva; `null` quando a dona e uma venda (G9). */
  production_order_id: number | null;
  /** Venda dona da reserva; `null` quando a dona e uma OP (G9). */
  sale_id: number | null;
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
  production_order_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK -> production_orders.id dona da reserva. NULL quando a dona e uma venda (G9, 2026-08-10) — CHECK de exatamente-um-dono no banco' },
  sale_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK -> sales.id dona da reserva (G9, 2026-08-10). NULL quando a dona e uma OP — CHECK de exatamente-um-dono no banco' },
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
    { fields: ['sale_id'] },
    { fields: ['product_id'] }
  ]
});

export = ProductionOrderReservation;
