/**
 * 🔧 Model: MaintenanceOrder (Ordens de Manutenção)
 *
 * @module models/MaintenanceOrder
 *
 * Gerencia ordens de manutenção de ativos (máquinas, equipamentos) e,
 * desde o BLOCO 4 FAC (correção, migration `20260807-000296`), chamados de
 * manutenção predial (decisão D-1 — reaproveita esta mesma tabela, nenhuma
 * tabela paralela). `asset_id` passou a ser `allowNull: true`: um chamado
 * predial pode não ter ativo físico associado (ex.: infiltração em
 * parede), usando apenas `facility_area_id`. O banco garante que ao menos
 * um dos dois esteja preenchido via
 * `ck_maintenance_orders_asset_or_area_present` (CHECK,
 * `asset_id IS NOT NULL OR facility_area_id IS NOT NULL`) — não validado
 * aqui no model, apenas na migration/uso.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface MaintenanceOrderAttributes {
  id: number;
  order_number: string;
  asset_id: number | null;
  maintenance_type: 'preventive' | 'corrective' | 'predictive' | 'emergency' | 'overhaul';
  priority: 'low' | 'normal' | 'high' | 'emergency';
  problem_description: string;
  reported_by: number | null;
  report_date: string;
  diagnosed_problem: string | null;
  diagnosed_by: number | null;
  diagnosis_date: string | null;
  service_performed: string | null;
  technician_id: number | null;
  start_date: string | null;
  completion_date: string | null;
  parts_cost: number;
  labor_cost: number;
  total_cost: number;
  downtime_hours: number;
  result: 'completed' | 'partial' | 'transferred' | 'canceled' | null;
  notes: string | null;
  scheduled_date: string | null;
  frequency_days: number | null;
  next_maintenance_date: string | null;
  status: 'open' | 'scheduled' | 'in_progress' | 'waiting_parts' | 'completed' | 'canceled';
  created_by: number | null;
  next_maintenance_km: number | null;
  facility_specialty: 'electrical' | 'plumbing' | 'civil' | 'hvac' | 'roofing' | 'gardening' | 'other' | null;
  facility_area_id: number | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const MaintenanceOrder = sequelize.define('MaintenanceOrder', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  order_number: { type: DataTypes.STRING(20), allowNull: false, unique: true, comment: 'Nº da ordem de manutenção' },
  asset_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK → assets.id — nullable desde o BLOCO 4 FAC (chamado predial pode não ter ativo, ver ck_maintenance_orders_asset_or_area_present)' },
  maintenance_type: { type: DataTypes.ENUM('preventive', 'corrective', 'predictive', 'emergency', 'overhaul'), allowNull: false },
  priority: { type: DataTypes.ENUM('low', 'normal', 'high', 'emergency'), defaultValue: 'normal' },
  problem_description: { type: DataTypes.TEXT, allowNull: false, comment: 'Descrição do problema relatado' },
  reported_by: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK → users.id' },
  // NOT NULL no banco de proposito: toda ordem tem data de abertura. O
  // `defaultValue` e aplicado pelo Sequelize no cliente, entao o INSERT nunca
  // omite a coluna (ver migration 20260810-000033, §"NAO afrouxadas").
  report_date: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW, comment: 'Data de abertura do chamado' },
  diagnosed_problem: { type: DataTypes.TEXT, allowNull: true },
  diagnosed_by: { type: DataTypes.INTEGER, allowNull: true },
  diagnosis_date: { type: DataTypes.DATEONLY, allowNull: true },
  service_performed: { type: DataTypes.TEXT, allowNull: true },
  technician_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK → users.id' },
  start_date: { type: DataTypes.DATEONLY, allowNull: true },
  completion_date: { type: DataTypes.DATEONLY, allowNull: true },
  parts_cost: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0, comment: 'Custo de peças' },
  labor_cost: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0, comment: 'Custo de mão de obra' },
  total_cost: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0, comment: 'Custo total' },
  downtime_hours: { type: DataTypes.DECIMAL(10, 1), defaultValue: 0, comment: 'Horas de parada' },
  result: { type: DataTypes.ENUM('completed', 'partial', 'transferred', 'canceled'), allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
  scheduled_date: { type: DataTypes.DATEONLY, allowNull: true },
  frequency_days: { type: DataTypes.INTEGER, allowNull: true, comment: 'Frequência em dias para manutenção preventiva' },
  next_maintenance_date: { type: DataTypes.DATEONLY, allowNull: true },
  status: { type: DataTypes.ENUM('open', 'scheduled', 'in_progress', 'waiting_parts', 'completed', 'canceled'), defaultValue: 'open' },
  created_by: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK → users.id' },
  next_maintenance_km: { type: DataTypes.INTEGER, allowNull: true, comment: 'BLOCO 4 FAC — preventiva veicular por km (RF-FAC-036/038)' },
  facility_specialty: { type: DataTypes.ENUM('electrical', 'plumbing', 'civil', 'hvac', 'roofing', 'gardening', 'other'), allowNull: true, comment: 'BLOCO 4 FAC — especialidade do chamado predial (RF-FAC-039)' },
  facility_area_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'BLOCO 4 FAC — FK → facility_areas.id (RF-FAC-039)' },
}, {
  tableName: 'maintenance_orders',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['status'] },
    { fields: ['maintenance_type'] },
    { fields: ['asset_id'] },
    { fields: ['technician_id'] },
    { fields: ['facility_area_id'] },
    { fields: ['facility_specialty'] }
  ]
});

export = MaintenanceOrder;
