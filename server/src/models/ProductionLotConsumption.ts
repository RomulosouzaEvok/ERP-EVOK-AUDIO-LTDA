/**
 * Model: ProductionLotConsumption
 *
 * @module models/ProductionLotConsumption
 *
 * Registra qual lote foi consumido por uma ordem de producao. Essa tabela
 * forma o vinculo de rastreabilidade entre materia-prima/subconjunto e
 * produto acabado gerado pela OP.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export interface ProductionLotConsumptionAttributes {
  id: number;
  production_order_id: number;
  lot_control_id: number;
  product_id: number;
  quantity_consumed: number;
  consumed_at: Date;
  user_id: number | null;
  notes: string | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const ProductionLotConsumption = sequelize.define('ProductionLotConsumption', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  production_order_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK -> production_orders.id' },
  lot_control_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK -> lot_controls.id' },
  product_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK -> products.id consumido' },
  quantity_consumed: {
    type: DataTypes.DECIMAL(12, 4),
    allowNull: false,
    validate: { min: 0.0001 }
  },
  consumed_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  user_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK -> users.id que registrou o consumo' },
  notes: { type: DataTypes.TEXT, allowNull: true }
}, {
  tableName: 'production_lot_consumptions',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['production_order_id'] },
    { fields: ['lot_control_id'] },
    { fields: ['product_id'] }
  ]
});

export = ProductionLotConsumption;
