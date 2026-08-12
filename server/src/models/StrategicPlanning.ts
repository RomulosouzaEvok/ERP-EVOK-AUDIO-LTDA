/**
 * 🎯 Model: StrategicPlanning (Objetivo Estratégico Anual — Diretoria)
 *
 * @module models/StrategicPlanning
 *
 * Objetivo estratégico anual, com meta (`kpi`/`target_value`) e realizado
 * (`actual_value`, atualizado por `UpdateStrategicPlanningActualUseCase`).
 * Dono do objetivo é `directorate_id` OU `department_id` OU nenhum dos dois
 * (objetivo da empresa toda) — nunca os dois ao mesmo tempo (CHECK
 * `strategic_plannings_owner_xor_ck` na migration
 * `20260812-000046-create-directorate-governance.cjs`).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type StrategicPlanningStatus = 'not_started' | 'in_progress' | 'achieved' | 'not_achieved';

interface StrategicPlanningAttributes {
  id: number;
  year: number;
  objective: string;
  directorate_id: number | null;
  department_id: number | null;
  kpi: string | null;
  target_value: number | null;
  actual_value: number | null;
  weight: number | null;
  status: StrategicPlanningStatus;
  responsible_id: number | null;
  created_by: number;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const StrategicPlanning = sequelize.define(
  'StrategicPlanning',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    year: { type: DataTypes.INTEGER, allowNull: false },
    objective: { type: DataTypes.TEXT, allowNull: false },
    directorate_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'FK -> directorates.id. Mutuamente exclusivo com department_id',
    },
    department_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'FK -> departments.id. Mutuamente exclusivo com directorate_id',
    },
    kpi: { type: DataTypes.STRING(200), allowNull: true },
    target_value: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    actual_value: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    weight: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    status: {
      type: DataTypes.ENUM('not_started', 'in_progress', 'achieved', 'not_achieved'),
      allowNull: false,
      defaultValue: 'not_started',
    },
    responsible_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK -> employees.id' },
    created_by: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK -> users.id' },
  },
  {
    tableName: 'strategic_plannings',
    underscored: true,
    timestamps: true,
    indexes: [
      { fields: ['year'] },
      { fields: ['directorate_id'] },
      { fields: ['department_id'] },
      { fields: ['status'] },
    ],
  },
);

// `export =` não pode conviver com nenhum outro export de topo neste projeto
// (guarda `tests/unit/export-assignment-guard.test.ts`) — por isso o tipo
// `StrategicPlanningAttributes` fica só como documentação interna.
export = StrategicPlanning;
