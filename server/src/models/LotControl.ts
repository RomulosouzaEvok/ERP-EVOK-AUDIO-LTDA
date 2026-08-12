/**
 * Model: LotControl
 *
 * @module models/LotControl
 *
 * Registra lotes industriais de materia-prima, subconjuntos e produto acabado.
 * Mantem origem, saldo disponivel e status para rastreabilidade de compras,
 * producao, qualidade e expedicao sem depender de ERP anterior.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type LotControlStatus = 'available' | 'reserved' | 'consumed' | 'blocked' | 'expired' | 'quarantine';

interface LotControlAttributes {
  id: number;
  product_id: number;
  item_id?: string | null;
  warehouse_id?: number | null;
  supplier_id: number | null;
  purchase_id: number | null;
  production_order_id: number | null;
  lot_number: string;
  status: LotControlStatus;
  quantity_initial: number;
  quantity_available: number;
  manufactured_at: string | null;
  expires_at: string | null;
  received_at: string | null;
  created_by: number | null;
  release_inspection_id: number | null;
  released_by: number | null;
  released_at: Date | null;
  blocked_at: Date | null;
  notes: string | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const LotControl = sequelize.define('LotControl', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  product_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK -> products.id (legado)' },
  item_id: { type: DataTypes.UUID, allowNull: true, comment: 'FK -> items.id (Fase 4.6 expand-contract)' },
  warehouse_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK -> warehouses.id (Bloco 4, UC-42) — NULL = lote legado sem deposito; quarentena/bloqueio (status) e ortogonal ao deposito (BUSINESS_RULES.md §12 item 9)' },
  supplier_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK -> suppliers.id quando o lote veio de compra' },
  purchase_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK -> purchase_orders.id quando o lote veio de recebimento' },
  production_order_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK -> production_orders.id quando o lote foi produzido internamente' },
  lot_number: { type: DataTypes.STRING(80), allowNull: false, comment: 'Codigo unico do lote por produto' },
  status: {
    type: DataTypes.ENUM('available', 'reserved', 'consumed', 'blocked', 'expired', 'quarantine'),
    defaultValue: 'available',
    allowNull: false,
    comment: "Lotes de compra nascem 'quarantine' (bloqueados p/ consumo ate inspecao de recebimento liberar via POST /lots/:id/release); produto acabado da producao nasce 'available'."
  },
  quantity_initial: {
    type: DataTypes.DECIMAL(12, 4),
    allowNull: false,
    validate: { min: 0 },
    comment: 'Quantidade original recebida ou produzida'
  },
  quantity_available: {
    type: DataTypes.DECIMAL(12, 4),
    allowNull: false,
    validate: { min: 0 },
    comment: 'Saldo atual rastreavel do lote'
  },
  manufactured_at: { type: DataTypes.DATEONLY, allowNull: true },
  expires_at: { type: DataTypes.DATEONLY, allowNull: true },
  received_at: { type: DataTypes.DATEONLY, allowNull: true },
  created_by: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK -> users.id' },
  // G7 (ISO 9001:2015 8.6) — rastreabilidade da LIBERACAO. Ate 2026-08-10 a
  // saida da quarentena so deixava um texto em `notes`: nao havia quem
  // autorizou, quando, nem contra qual evidencia. Todos nullable de
  // proposito: lote nunca liberado e liberacao legada (anterior ao G7)
  // ficam com NULL — e esse NULL que identifica, numa auditoria, a
  // liberacao sem evidencia.
  release_inspection_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK -> quality_inspections.id que autorizou a liberacao (G7)' },
  released_by: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK -> users.id de quem autorizou a liberacao (do JWT) — pode diferir do inspetor' },
  released_at: { type: DataTypes.DATE, allowNull: true, comment: 'Data/hora da liberacao do lote' },
  // G7 (2026-08-11) — quando o bloqueio VIGENTE comecou. Sem esta data nao
  // existe "inspecao posterior ao bloqueio" que se possa exigir, e um lote
  // bloqueado voltava a ser liberado com a inspecao aprovada de ANTES do
  // bloqueio (ISO 9001 8.7). Preenchida pelos dois caminhos de bloqueio
  // (endpoint /block e RNC) e zerada na liberacao: descreve o bloqueio
  // vigente, nao o historico.
  blocked_at: { type: DataTypes.DATE, allowNull: true, comment: 'Inicio do bloqueio vigente (G7). Re-liberar exige inspecao aprovada posterior a esta data.' },
  notes: { type: DataTypes.TEXT, allowNull: true }
}, {
  tableName: 'lot_controls',
  underscored: true,
  timestamps: true,
  indexes: [
    { unique: true, fields: ['product_id', 'lot_number'] },
    { fields: ['status'] },
    { fields: ['expires_at'] },
    { fields: ['warehouse_id'] }
  ]
});

export = LotControl;
