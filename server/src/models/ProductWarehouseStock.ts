/**
 * 📦 Model: ProductWarehouseStock (Saldo de Produto por Deposito)
 *
 * @module models/ProductWarehouseStock
 *
 * Saldo de um produto dentro de um deposito especifico. Substitui o
 * conceito de saldo global unico: o saldo total de um produto passa a
 * ser a SOMA dos saldos em todos os depositos ativos.
 *
 * INVARIANTE (docs/business/BUSINESS_RULES.md §12 item 3, obrigatoria e
 * testavel):
 *   saldo_total(produto) = SOMA(quantity) de ProductWarehouseStock do
 *   produto, para todo deposito ativo.
 * Ate a migracao completa do backend para dual-write por deposito (fase
 * contract), `Product.quantity` continua sendo a fonte de verdade do
 * saldo total e esta tabela e populada em paralelo (dual-write) —
 * nenhuma rotina deve alterar um sem refletir no outro. Transferencias
 * entre depositos (Bloco 4 backend, `warehouse_transfers`) NUNCA alteram
 * a soma total: debitam origem e creditam destino no mesmo valor, na
 * mesma transacao atomica (§12 item 4).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export interface ProductWarehouseStockAttributes {
  id: number;
  product_id: number;
  warehouse_id: number;
  quantity: number;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

export interface ProductWarehouseStockCreationAttributes {
  id?: number;
  product_id: number;
  warehouse_id: number;
  quantity?: number;
}

const ProductWarehouseStock = sequelize.define('ProductWarehouseStock', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  product_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'FK -> products.id',
  },
  warehouse_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'FK -> warehouses.id',
  },
  quantity: {
    type: DataTypes.DECIMAL(18, 6),
    allowNull: false,
    defaultValue: 0,
    validate: { min: 0 },
    comment: 'Saldo do produto neste deposito (CHECK quantity >= 0 no banco)',
  },
}, {
  tableName: 'product_warehouse_stock',
  underscored: true,
  timestamps: true,
  indexes: [
    { unique: true, fields: ['product_id', 'warehouse_id'] },
    { fields: ['product_id'] },
    { fields: ['warehouse_id'] },
  ],
});

export = ProductWarehouseStock;
