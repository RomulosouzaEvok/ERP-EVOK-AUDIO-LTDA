/**
 * 📦 Model: InventoryMovement (Movimentações de Estoque)
 *
 * @module models/InventoryMovement
 *
 * Registra todas as movimentações de estoque (entrada, saída, ajuste).
 * Toda alteração em Product.quantity DEVE passar por este model.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface InventoryMovementAttributes {
  id: number;
  product_id: number;
  item_id?: string | null;
  user_id: number;
  warehouse_id?: number | null;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  unit_cost: number;
  description: string | null;
  reference_id: number | null;
  reference_type: 'sale' | 'purchase' | 'production' | 'adjustment' | 'transfer' | 'sst_epi_delivery' | 'import' | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const InventoryMovement = sequelize.define('InventoryMovement', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  product_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK → products.id (LEGADO)' },
  item_id: { type: DataTypes.UUID, allowNull: true, comment: 'FK → items.id (NOVO, parallel to product_id)' },
  user_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK → users.id (responsável)' },
  warehouse_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK → warehouses.id (Bloco 4, UC-42) — NULL = movimento legado sem depósito' },
  type: { type: DataTypes.ENUM('in', 'out', 'adjustment'), allowNull: false, comment: 'Tipo: in=entrada, out=saída, adjustment=ajuste' },
  quantity: { type: DataTypes.DECIMAL(18, 6), allowNull: false, comment: 'Quantidade movimentada' },
  unit_cost: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0, comment: 'Custo unitário no momento' },
  description: DataTypes.TEXT,
  reference_id: DataTypes.INTEGER,
  reference_type: {
    type: DataTypes.ENUM('sale', 'purchase', 'production', 'adjustment', 'transfer', 'sst_epi_delivery', 'import'),
    comment: "'sst_epi_delivery' adicionado em 20260806-000131-create-sst-entrega-epi.cjs (BLOCO 1 SST, confirmação de EntregaEPI) — sincronizado aqui na auditoria cruzada, pois o valor já existia no ENUM do Postgres mas faltava neste model TS. 'import' adicionado em 20260809-000027 (gap G14): antes a entrada de material importado gravava 'purchase' com reference_id de import_processes, e a consulta reversa por (reference_type, reference_id) devolvia um pedido de compra alheio.",
  }
}, {
  tableName: 'inventory_movements',
  underscored: true,
  timestamps: true,
  indexes: [
    // Consulta mais comum: historico/rastreabilidade de um produto por
    // periodo (GET /api/inventory/movements?product_id=X). Sem indice,
    // table scan completo nesta tabela que cresce a cada entrada/saida/
    // ajuste do ERP inteiro.
    { fields: ['product_id', 'created_at'] },
    // Consulta reversa: todas as movimentacoes originadas por uma venda/
    // compra/ordem de producao especifica (auditoria/estorno).
    { fields: ['reference_type', 'reference_id'] },
    // Filtro por deposito (Bloco 4, UC-42) — extrato de movimentacao por
    // deposito, ver BUSINESS_RULES.md §12 item 10.
    { fields: ['warehouse_id'] }
  ]
});

export = InventoryMovement;
