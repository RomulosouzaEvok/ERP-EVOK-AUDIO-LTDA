/**
 * 🏷️ Model: CostCenter (Centro de Custo)
 *
 * @module models/CostCenter
 *
 * Dimensão de análise financeira transversal a Contas a Pagar/Receber
 * (`AccountPayable.cost_center_id` / `AccountReceivable.cost_center_id`),
 * usada para segmentar o relatório `GET /api/finance/cost-centers/report`
 * por área/departamento de negócio. Independente de `Department` (RH):
 * centro de custo é uma dimensão puramente financeira, podendo ou não
 * corresponder 1:1 a um departamento (ver migration
 * `20260806-000020-create-cost-centers.cjs`).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface CostCenterAttributes {
  id: number;
  code: string;
  name: string;
  description: string | null;
  active: boolean;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const CostCenter = sequelize.define('CostCenter', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  code: { type: DataTypes.STRING(30), allowNull: false, unique: true, comment: 'Codigo unico do centro de custo' },
  name: { type: DataTypes.STRING(100), allowNull: false, comment: 'Nome do centro de custo' },
  description: { type: DataTypes.TEXT, allowNull: true },
  active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, comment: 'Desativacao logica (sem delete fisico) — registros com lancamentos historicos preservam auditoria' },
}, {
  tableName: 'cost_centers',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['code'], unique: true, name: 'uq_cost_centers_code' },
  ],
});

export = CostCenter;
