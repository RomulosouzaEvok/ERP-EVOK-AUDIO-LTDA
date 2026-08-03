/**
 * 📐 Model: EngineeringProject (Projetos de Engenharia / P&D)
 *
 * @module models/EngineeringProject
 *
 * Gerencia projetos de desenvolvimento de produto (NPI), melhorias,
 * customizações e pesquisa, acompanhando estágio do PDP (concept → production),
 * orçamento e custo real, e vínculo opcional com o produto resultante.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export interface EngineeringProjectAttributes {
  id: number;
  project_code: string;
  name: string;
  description: string | null;
  project_type: 'new_product' | 'improvement' | 'customization' | 'research';
  product_id: number | null;
  project_manager_id: number | null;
  start_date: string | null;
  target_date: string | null;
  completion_date: string | null;
  budget: number | null;
  actual_cost: number;
  stage: 'concept' | 'design' | 'prototype' | 'testing' | 'homologation' | 'production';
  status: 'active' | 'paused' | 'completed' | 'canceled';
  priority: 'low' | 'normal' | 'high' | 'critical';
  notes: string | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const EngineeringProject = sequelize.define('EngineeringProject', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  project_code: { type: DataTypes.STRING(20), allowNull: false, unique: true, comment: 'Código único do projeto de engenharia' },
  name: { type: DataTypes.STRING(200), allowNull: false, comment: 'Nome do projeto' },
  description: { type: DataTypes.TEXT, allowNull: true },
  project_type: { type: DataTypes.ENUM('new_product', 'improvement', 'customization', 'research'), allowNull: false, defaultValue: 'new_product' },
  product_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK → products.id' },
  project_manager_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK → users.id (gerente do projeto)' },
  start_date: { type: DataTypes.DATEONLY, allowNull: true },
  target_date: { type: DataTypes.DATEONLY, allowNull: true },
  completion_date: { type: DataTypes.DATEONLY, allowNull: true },
  budget: { type: DataTypes.DECIMAL(15, 2), allowNull: true, comment: 'Orçamento planejado do projeto' },
  actual_cost: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, comment: 'Custo real acumulado' },
  stage: { type: DataTypes.ENUM('concept', 'design', 'prototype', 'testing', 'homologation', 'production'), allowNull: false, defaultValue: 'concept', comment: 'Fase do PDP (Processo de Desenvolvimento de Produto)' },
  status: { type: DataTypes.ENUM('active', 'paused', 'completed', 'canceled'), allowNull: false, defaultValue: 'active' },
  priority: { type: DataTypes.ENUM('low', 'normal', 'high', 'critical'), allowNull: false, defaultValue: 'normal' },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'engineering_projects',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['product_id'], name: 'idx_engineering_projects_product_id' },
    { fields: ['status'], name: 'idx_engineering_projects_status' },
    { fields: ['stage'], name: 'idx_engineering_projects_stage' },
  ],
});

export = EngineeringProject;
