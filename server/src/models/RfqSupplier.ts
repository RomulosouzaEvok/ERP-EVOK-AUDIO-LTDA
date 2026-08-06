/**
 * 📨 Model: RfqSupplier (Fornecedor convidado a cotar)
 *
 * @module models/RfqSupplier
 *
 * Vinculo N:N entre `Rfq` e `Supplier`, com status por fornecedor:
 * `invited` (convidado, ainda sem resposta), `responded` (registrou ao
 * menos uma cotacao) ou `declined` (reservado para uso futuro — nao ha
 * endpoint nesta v1 que grave este valor).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface RfqSupplierAttributes {
  id: number;
  rfq_id: number;
  supplier_id: number;
  status: 'invited' | 'responded' | 'declined';
  invited_at: Date;
  responded_at: Date | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const RfqSupplier = sequelize.define('RfqSupplier', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  rfq_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK -> rfqs.id' },
  supplier_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK -> suppliers.id' },
  status: { type: DataTypes.ENUM('invited', 'responded', 'declined'), allowNull: false, defaultValue: 'invited' },
  invited_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  responded_at: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'rfq_suppliers',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['rfq_id', 'supplier_id'], unique: true, name: 'uq_rfq_suppliers_rfq_supplier' },
    { fields: ['rfq_id'] },
    { fields: ['supplier_id'] },
    { fields: ['status'] },
  ],
});

export = RfqSupplier;
