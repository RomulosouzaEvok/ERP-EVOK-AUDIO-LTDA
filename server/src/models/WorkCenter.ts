/**
 * 🏭 Model: WorkCenter (Centro de Trabalho)
 *
 * @module models/WorkCenter
 *
 * Representa um posto/centro de trabalho estruturado (máquina, linha ou célula
 * produtiva), com capacidade finita expressa em horas produtivas por dia por
 * máquina e um fator de eficiência histórica. Substitui gradualmente a coluna
 * livre `work_center` (STRING) de `production_route_steps` (fase expand).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface WorkCenterAttributes {
  id: number;
  code: string;
  name: string;
  description: string | null;
  machines_count: number;
  capacity_hours_per_day: number;
  efficiency_factor: number;
  cost_per_hour: number;
  active: boolean;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const WorkCenter = sequelize.define('WorkCenter', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  code: { type: DataTypes.STRING(30), allowNull: false, unique: true, comment: 'Codigo unico do centro de trabalho' },
  name: { type: DataTypes.STRING(100), allowNull: false, comment: 'Nome do centro de trabalho' },
  description: { type: DataTypes.TEXT, allowNull: true },
  machines_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1, comment: 'Quantidade de maquinas/recursos identicos no centro' },
  capacity_hours_per_day: { type: DataTypes.DECIMAL(6, 2), allowNull: false, defaultValue: 8, comment: 'Horas produtivas por dia, por maquina' },
  efficiency_factor: { type: DataTypes.DECIMAL(5, 4), allowNull: false, defaultValue: 1, comment: 'Fator de eficiencia historica (0 a 1)' },
  cost_per_hour: { type: DataTypes.DECIMAL(18, 6), allowNull: false, defaultValue: 0, comment: 'Custo de mao-de-obra + operacao por hora produtiva deste centro (BRL/h), usado no custeio real de producao' },
  active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, {
  tableName: 'work_centers',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['code'], unique: true, name: 'uq_work_centers_code' },
  ],
});

export = WorkCenter;
