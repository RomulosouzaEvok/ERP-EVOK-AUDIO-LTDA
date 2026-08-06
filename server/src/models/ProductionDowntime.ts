/**
 * ⛔ Model: ProductionDowntime (Parada de Máquina/Centro de Trabalho)
 *
 * @module models/ProductionDowntime
 *
 * Registro de parada de um `WorkCenter` (geral do centro ou vinculada a uma
 * `ProductionOrder` específica), usado pelo apontamento de chão de fábrica
 * (`chao_de_fabrica`) e consumido pelo relatório de OEE
 * (`GetOeeReportUseCase`) para descontar horas de disponibilidade.
 *
 * Uma parada pode ficar em aberto (`finished_at = null`) enquanto o motivo
 * ainda não foi resolvido — a regra de negócio de "no máximo 1 parada aberta
 * por centro de trabalho" é aplicada na camada de use case
 * (`OpenProductionDowntimeUseCase`), não em constraint de banco (SQLite/testes
 * não usam índice parcial; o índice parcial em PostgreSQL é uma defesa
 * adicional contra corrida, ver migration `20260806-000060`).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type ProductionDowntimeReason =
  | 'setup'
  | 'manutencao_corretiva'
  | 'manutencao_preventiva'
  | 'falta_material'
  | 'falta_operador'
  | 'qualidade'
  | 'outros';

interface ProductionDowntimeAttributes {
  id: number;
  work_center_id: number;
  production_order_id: number | null;
  reason: ProductionDowntimeReason;
  notes: string | null;
  started_at: Date;
  finished_at: Date | null;
  created_by: number;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const ProductionDowntime = sequelize.define('ProductionDowntime', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  work_center_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK -> work_centers.id (centro parado)' },
  production_order_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK -> production_orders.id (opcional: parada vinculada a uma OP especifica, ou null = parada geral do centro)' },
  reason: {
    type: DataTypes.ENUM('setup', 'manutencao_corretiva', 'manutencao_preventiva', 'falta_material', 'falta_operador', 'qualidade', 'outros'),
    allowNull: false,
    comment: 'Categoria da parada, usada no breakdown do OEE por motivo',
  },
  notes: { type: DataTypes.TEXT, allowNull: true, comment: 'Detalhamento livre do motivo' },
  started_at: { type: DataTypes.DATE, allowNull: false, comment: 'Inicio da parada' },
  finished_at: { type: DataTypes.DATE, allowNull: true, comment: 'Fim da parada; null = parada em aberto' },
  created_by: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK -> users.id (quem abriu o registro)' },
}, {
  tableName: 'production_downtimes',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['work_center_id'], name: 'idx_production_downtimes_work_center_id' },
    { fields: ['production_order_id'], name: 'idx_production_downtimes_production_order_id' },
    { fields: ['started_at'], name: 'idx_production_downtimes_started_at' },
  ],
});

export = ProductionDowntime;
