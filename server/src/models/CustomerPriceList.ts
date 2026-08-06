/**
 * 💲 Model: CustomerPriceList (Tabela de Preços por Cliente)
 *
 * @module models/CustomerPriceList
 *
 * Preço unitário negociado para um par cliente×produto, com vigência
 * opcional (`valid_from`/`valid_until`) e soft delete via `active`. Usado
 * pelo módulo `sales` para sugerir o preço unitário ao adicionar um item a
 * um pedido de venda quando existe um preço específico para aquele
 * cliente — o vendedor sempre pode sobrescrever manualmente
 * (`SaleValidators`/`SaleEntity` não exigem que `unit_price` bata com esta
 * tabela).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface CustomerPriceListAttributes {
  id: number;
  customer_id: number;
  product_id: number;
  unit_price: number;
  currency: string;
  valid_from: string | null;
  valid_until: string | null;
  active: boolean;
  created_by: number | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const CustomerPriceList = sequelize.define('CustomerPriceList', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  customer_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK -> clients.id' },
  product_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK -> products.id' },
  unit_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false, comment: 'Preco unitario negociado com o cliente' },
  currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'BRL' },
  valid_from: { type: DataTypes.DATEONLY, allowNull: true, comment: 'Inicio da vigencia (NULL = valido desde sempre)' },
  valid_until: { type: DataTypes.DATEONLY, allowNull: true, comment: 'Fim da vigencia (NULL = sem prazo de expiracao)' },
  active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, comment: 'Soft delete' },
  created_by: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK -> users.id (quem cadastrou o preco)' },
}, {
  tableName: 'customer_price_lists',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['customer_id'], name: 'idx_customer_price_lists_customer_id' },
    { fields: ['customer_id', 'product_id'], name: 'idx_customer_price_lists_customer_product' },
    { fields: ['product_id'], name: 'idx_customer_price_lists_product_id' },
  ],
});

export = CustomerPriceList;
