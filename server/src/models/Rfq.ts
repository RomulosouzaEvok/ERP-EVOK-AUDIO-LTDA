/**
 * 📨 Model: Rfq (Cotacao / Request for Quotation multi-fornecedor)
 *
 * @module models/Rfq
 *
 * Cabecalho de uma cotacao de compra enviada a um ou mais fornecedores.
 * Pode nascer de uma `PurchaseRequisition` aprovada/pendente (itens
 * puxados automaticamente) ou ser avulsa (itens informados diretamente).
 *
 * Ciclo de vida (`status`): `draft` -> `sent` (ao convidar o primeiro
 * fornecedor) -> `quoted` (ao registrar a primeira resposta) -> `awarded`
 * (ao adjudicar, gerando pedido(s) de compra) | `cancelled`.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface RfqAttributes {
  id: number;
  rfq_number: string;
  requisition_id: number | null;
  status: 'draft' | 'sent' | 'quoted' | 'awarded' | 'cancelled';
  created_by: number;
  response_deadline: string | null;
  notes: string | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const Rfq = sequelize.define('Rfq', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  rfq_number: { type: DataTypes.STRING(60), allowNull: false, unique: true, comment: 'Numero da cotacao, formato RFQ-<ano>-XXXX' },
  requisition_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK -> purchase_requisitions.id (opcional — RFQ avulsa quando null)' },
  status: { type: DataTypes.ENUM('draft', 'sent', 'quoted', 'awarded', 'cancelled'), allowNull: false, defaultValue: 'draft' },
  created_by: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK -> users.id (comprador que criou a cotacao)' },
  response_deadline: { type: DataTypes.DATEONLY, allowNull: true, comment: 'Prazo de resposta dos fornecedores convidados' },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'rfqs',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['requisition_id'] },
    { fields: ['status'] },
    { fields: ['created_by'] },
  ],
});

export = Rfq;
