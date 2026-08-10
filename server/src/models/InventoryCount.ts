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
 * Atribuição de funcionário (`assigned_to`, nullable): opcional na criação.
 * Quando `null`, a contagem fica disponível em um "pool" — qualquer
 * funcionário autorizado (`operate` em `contagens`, mesmo depósito) pode
 * "pegá-la" chamando `POST /:id/start`, que faz o claim atômico
 * (`assigned_to = usuário logado`) dentro de uma transação com lock
 * pessimista (`StartInventoryCountUseCase`).
 *
 * A alteração efetiva de `Product.quantity` nunca é feita por este model —
 * é sempre deanterior a `InventoryService.adjust` pelos use cases do módulo
 * `server/src/modules/inventory` (ver README do módulo).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type InventoryCountStatus =
  | 'draft'
  | 'counting'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'adjusted';

type InventoryCountType = 'cycle' | 'full' | 'spot';

interface InventoryCountAttributes {
  id: number;
  count_number: string;
  status: InventoryCountStatus;
  count_type: InventoryCountType;
  warehouse_id: number | null;
  department_id: number | null;
  location: string | null;
  started_at: Date | null;
  completed_at: Date | null;
  approved_at: Date | null;
  created_by: number;
  approved_by: number | null;
  assigned_to: number | null;
  notes: string | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const InventoryCount = sequelize.define('InventoryCount', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  count_number: { type: DataTypes.STRING(30), allowNull: false, unique: true, comment: 'Nº da contagem de inventário' },
  warehouse_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'FK → warehouses.id (depósito ao qual TODA a contagem pertence; nullable apenas por legado pré-Bloco 4 — use case de criação deve exigir o campo em contagens novas)'
  },
  department_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'FK → departments.id (departamento dono da contagem; opcional, usado pelo painel de TV de demandas por departamento — nullable também no histórico legado, sem backfill possível, ver migration 20260806-000003)'
  },
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
  location: { type: DataTypes.STRING(100), allowNull: true, comment: 'Local/área física contada (opcional). NOT NULL indevido removido na migration 20260810-000028' },
  started_at: { type: DataTypes.DATE, allowNull: true, comment: 'Data/hora de início da contagem (NULL enquanto draft)' },
  completed_at: { type: DataTypes.DATE, allowNull: true, comment: 'Data/hora de envio para aprovação (NULL antes disso)' },
  approved_at: { type: DataTypes.DATE, allowNull: true, comment: 'Data/hora da aprovação (ou rejeição); NULL antes disso' },
  created_by: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK → users.id (quem criou a contagem)' },
  approved_by: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK → users.id (quem aprovou/rejeitou); NULL até a aprovação. FK é ON DELETE SET NULL, o que exige coluna nullable' },
  assigned_to: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'FK → users.id (funcionário responsável pela contagem; NULL = disponível no "pool" para qualquer funcionário autorizado pegar via POST /:id/start, que faz o claim atômico)'
  },
  notes: { type: DataTypes.TEXT, allowNull: true, comment: 'Observações livres (opcional)' }
}, {
  tableName: 'inventory_counts',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['status'] },
    { fields: ['count_type'] },
    { fields: ['created_by'] },
    { fields: ['warehouse_id'] },
    { fields: ['assigned_to'] },
    { fields: ['department_id'] }
  ]
});

export = InventoryCount;
