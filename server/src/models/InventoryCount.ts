/**
 * 🔢 Model: InventoryCount (Inventário Cíclico / Contagem de Estoque)
 *
 * @module models/InventoryCount
 *
 * Representa uma "contagem" de estoque (cíclica, geral ou pontual/spot),
 * cabeçalho do processo de inventário físico. Os itens contados ficam em
 * `InventoryCountItem` (1:N).
 *
 * Workflow de status:
 * `draft` → `counting` → `pending_approval` → `approved` → `adjusted`
 * (ou `pending_approval` → `rejected`).
 *
 * A alteração efetiva de `Product.quantity` nunca é feita por este model —
 * é sempre deanterior a `InventoryService.adjust` pelos use cases do módulo
 * `server/src/modules/inventory` (ver README do módulo).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export type InventoryCountStatus =
  | 'draft'
  | 'counting'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'adjusted';

export type InventoryCountType = 'cycle' | 'full' | 'spot';

export interface InventoryCountAttributes {
  id: number;
  count_number: string;
  status: InventoryCountStatus;
  count_type: InventoryCountType;
  location: string | null;
  started_at: Date | null;
  completed_at: Date | null;
  approved_at: Date | null;
  created_by: number;
  approved_by: number | null;
  notes: string | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const InventoryCount = sequelize.define('InventoryCount', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  count_number: { type: DataTypes.STRING(30), allowNull: false, unique: true, comment: 'Nº da contagem de inventário' },
  status: {
    type: DataTypes.ENUM('draft', 'counting', 'pending_approval', 'approved', 'rejected', 'adjusted'),
    allowNull: false,
    defaultValue: 'draft',
    comment: 'Workflow: draft -> counting -> pending_approval -> approved -> adjusted (ou rejected)'
  },
  count_type: {
    type: DataTypes.ENUM('cycle', 'full', 'spot'),
    allowNull: false,
    defaultValue: 'cycle',
    comment: 'cycle=inventário cíclico, full=inventário geral, spot=contagem pontual'
  },
  location: { type: DataTypes.STRING(100), comment: 'Local/área física contada (opcional)' },
  started_at: { type: DataTypes.DATE, comment: 'Data/hora de início da contagem' },
  completed_at: { type: DataTypes.DATE, comment: 'Data/hora de envio para aprovação' },
  approved_at: { type: DataTypes.DATE, comment: 'Data/hora da aprovação (ou rejeição)' },
  created_by: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK → users.id (quem criou a contagem)' },
  approved_by: { type: DataTypes.INTEGER, comment: 'FK → users.id (quem aprovou/rejeitou)' },
  notes: DataTypes.TEXT
}, {
  tableName: 'inventory_counts',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['status'] },
    { fields: ['count_type'] },
    { fields: ['created_by'] }
  ]
});

export = InventoryCount;
