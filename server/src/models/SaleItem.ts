/**
 * 🛒 Model: SaleItem (Itens da Venda)
 *
 * @module models/SaleItem
 *
 * Itens que compõem uma venda, com produto, quantidade e preços.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export interface SaleItemAttributes {
  id: number;
  sale_id: number;
  product_id: number;
  item_id?: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  cfop: string | null;
  icms_cst: string | null;
  icms_aliquot: number | null;
  icms_base: number | null;
  icms_value: number | null;
  ipi_cst: string | null;
  ipi_aliquot: number | null;
  ipi_value: number | null;
  pis_cst: string | null;
  pis_aliquot: number | null;
  pis_value: number | null;
  cofins_cst: string | null;
  cofins_aliquot: number | null;
  cofins_value: number | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const SaleItem = sequelize.define('SaleItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  sale_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK → sales.id' },
  product_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK → products.id (LEGADO)' },
  item_id: { type: DataTypes.UUID, allowNull: true, comment: 'FK → items.id (NOVO, parallel to product_id)' },
  quantity: { type: DataTypes.DECIMAL(18, 6), allowNull: false, comment: 'Quantidade vendida' },
  unit_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false, comment: 'Preço unitário' },
  total_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false, comment: 'Total (qtd × preço)' },
  cfop: DataTypes.STRING(4),
  icms_cst: DataTypes.STRING(3),
  icms_aliquot: DataTypes.DECIMAL(5, 2),
  icms_base: DataTypes.DECIMAL(12, 2),
  icms_value: DataTypes.DECIMAL(12, 2),
  ipi_cst: DataTypes.STRING(3),
  ipi_aliquot: DataTypes.DECIMAL(5, 2),
  ipi_value: DataTypes.DECIMAL(12, 2),
  pis_cst: DataTypes.STRING(3),
  pis_aliquot: DataTypes.DECIMAL(5, 2),
  pis_value: DataTypes.DECIMAL(12, 2),
  cofins_cst: DataTypes.STRING(3),
  cofins_aliquot: DataTypes.DECIMAL(5, 2),
  cofins_value: DataTypes.DECIMAL(12, 2)
}, {
  tableName: 'sale_items',
  underscored: true,
  timestamps: true
});

export = SaleItem;
