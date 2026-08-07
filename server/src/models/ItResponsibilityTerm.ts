/**
 * 💻 Model: ItResponsibilityTerm (Termo de Responsabilidade de Equipamento)
 *
 * @module models/ItResponsibilityTerm
 *
 * Tabela `it_responsibility_terms` (migration `20260807-000152`, UC-50).
 * Reutiliza `assets`/`employees` (BR-TI-008) — nenhum cadastro paralelo de
 * equipamento. Invariante "no máximo 1 termo `active` por asset"
 * (BR-TI-010) é garantida por índice único parcial no banco
 * (`uq_it_responsibility_terms_active_per_asset`), não replicada aqui.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type AcceptanceType = 'physical_signature' | 'digital_ack';
type ConditionOnReturn = 'ok' | 'damaged' | 'incomplete';
type TermStatus = 'active' | 'returned' | 'lost';

interface ItResponsibilityTermAttributes {
  id: number;
  term_number: string;
  asset_id: number;
  employee_id: number;
  delivered_at: Date;
  delivered_by: number;
  condition_on_delivery: string | null;
  accessories: string | null;
  acceptance_type: AcceptanceType;
  signed_document_path: string | null;
  returned_at: Date | null;
  received_by: number | null;
  condition_on_return: ConditionOnReturn | null;
  return_notes: string | null;
  lost_justification: string | null;
  related_ticket_id: number | null;
  related_maintenance_order_id: number | null;
  status: TermStatus;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const ItResponsibilityTerm = sequelize.define<any, ItResponsibilityTermAttributes>('ItResponsibilityTerm', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  term_number: { type: DataTypes.STRING(30), allowNull: false, unique: true },
  asset_id: { type: DataTypes.INTEGER, allowNull: false },
  employee_id: { type: DataTypes.INTEGER, allowNull: false },
  delivered_at: { type: DataTypes.DATE, allowNull: false },
  delivered_by: { type: DataTypes.INTEGER, allowNull: false },
  condition_on_delivery: DataTypes.TEXT,
  accessories: DataTypes.TEXT,
  acceptance_type: { type: DataTypes.ENUM('physical_signature', 'digital_ack'), allowNull: false },
  signed_document_path: DataTypes.STRING(500),
  returned_at: DataTypes.DATE,
  received_by: { type: DataTypes.INTEGER, allowNull: true },
  condition_on_return: { type: DataTypes.ENUM('ok', 'damaged', 'incomplete'), allowNull: true },
  return_notes: DataTypes.TEXT,
  lost_justification: DataTypes.TEXT,
  related_ticket_id: { type: DataTypes.INTEGER, allowNull: true },
  related_maintenance_order_id: { type: DataTypes.INTEGER, allowNull: true },
  status: { type: DataTypes.ENUM('active', 'returned', 'lost'), allowNull: false, defaultValue: 'active' },
}, {
  tableName: 'it_responsibility_terms',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['employee_id'] },
    { fields: ['asset_id'] },
    { fields: ['status'] },
  ],
});

export = ItResponsibilityTerm;
