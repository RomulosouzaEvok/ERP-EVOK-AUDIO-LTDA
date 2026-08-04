/**
 * 🔄 Model: WarehouseTransfer (Transferência Entre Depósitos)
 *
 * @module models/WarehouseTransfer
 *
 * Solicitação de transferência de saldo de um produto entre dois
 * depósitos (`Warehouse`). Nasce em `status = 'pending'` e só se efetiva
 * (débito na origem + crédito no destino, na mesma transação atômica)
 * após aprovação por um usuário com nível `approve` no módulo `estoque`
 * (docs/business/BUSINESS_RULES.md §12 itens 6 e 8).
 *
 * Regras de Negócio:
 * - `from_warehouse_id` != `to_warehouse_id` (CHECK no banco).
 * - `quantity` > 0 (CHECK no banco).
 * - `reason` obrigatório (texto livre, auditoria).
 * - Transferência aprovada NUNCA altera `products.quantity` (soma total
 *   do produto é invariante — debita origem e credita destino no mesmo
 *   valor, §12 item 4).
 * - Gera dois `InventoryMovement` (`type='transfer'`, um `out` na
 *   origem e um `in` no destino) referenciando esta transferência via
 *   `reference_type='transfer'` / `reference_id=warehouse_transfers.id`.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export type WarehouseTransferStatus = 'pending' | 'approved' | 'rejected';

export interface WarehouseTransferAttributes {
  id: number;
  product_id: number;
  from_warehouse_id: number;
  to_warehouse_id: number;
  quantity: number;
  reason: string;
  user_id: number;
  approved_by: number | null;
  status: WarehouseTransferStatus;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

export interface WarehouseTransferCreationAttributes {
  id?: number;
  product_id: number;
  from_warehouse_id: number;
  to_warehouse_id: number;
  quantity: number;
  reason: string;
  user_id: number;
  approved_by?: number | null;
  status?: WarehouseTransferStatus;
}

const WarehouseTransfer = sequelize.define('WarehouseTransfer', {
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
  from_warehouse_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'FK -> warehouses.id (origem)',
  },
  to_warehouse_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'FK -> warehouses.id (destino) — CHECK from<>to no banco',
  },
  quantity: {
    type: DataTypes.DECIMAL(18, 6),
    allowNull: false,
    validate: { min: 0.000001 },
    comment: 'Quantidade solicitada (CHECK quantity > 0 no banco)',
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Motivo obrigatorio da transferencia',
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'FK -> users.id (quem solicitou)',
  },
  approved_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'FK -> users.id (quem aprovou/rejeitou, nivel approve do modulo estoque)',
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    allowNull: false,
    defaultValue: 'pending',
  },
}, {
  tableName: 'warehouse_transfers',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['product_id'] },
    { fields: ['from_warehouse_id'] },
    { fields: ['to_warehouse_id'] },
    { fields: ['status'] },
  ],
});

export = WarehouseTransfer;
