/**
 * Model: ProductCostLedger
 *
 * @module models/ProductCostLedger
 *
 * Historico imutavel de custos reais por produto. Cada entrada registra a
 * origem do custo, a quantidade, o custo unitario aplicado e o resultado do
 * custo medio ponderado salvo em `Product.cost_price`.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type ProductCostSourceType = 'purchase' | 'production' | 'adjustment' | 'production_labor' | 'production_overhead' | 'import';

interface ProductCostLedgerAttributes {
  id: number;
  product_id: number;
  source_type: ProductCostSourceType;
  source_id: number | null;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  previous_cost: number;
  new_cost: number;
  created_by: number | null;
  notes: string | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const ProductCostLedger = sequelize.define('ProductCostLedger', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  product_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK -> products.id' },
  source_type: {
    type: DataTypes.ENUM('purchase', 'production', 'adjustment', 'production_labor', 'production_overhead', 'import'),
    allowNull: false,
    comment: "'import' adicionado em 20260809-000027 (gap G14) — custo nacionalizado de processo de importacao; antes era gravado como 'purchase' com source_id de import_processes.",
  },
  source_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'ID da origem: compra, OP ou ajuste' },
  quantity: { type: DataTypes.DECIMAL(12, 4), allowNull: false, validate: { min: 0.0001 } },
  unit_cost: { type: DataTypes.DECIMAL(12, 4), allowNull: false, validate: { min: 0 } },
  total_cost: { type: DataTypes.DECIMAL(14, 4), allowNull: false, validate: { min: 0 } },
  previous_cost: { type: DataTypes.DECIMAL(12, 4), allowNull: false, defaultValue: 0 },
  new_cost: { type: DataTypes.DECIMAL(12, 4), allowNull: false, defaultValue: 0 },
  created_by: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK -> users.id' },
  notes: { type: DataTypes.TEXT, allowNull: true }
}, {
  tableName: 'product_cost_ledgers',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['product_id'] },
    { fields: ['source_type', 'source_id'] }
  ]
});

export = ProductCostLedger;
