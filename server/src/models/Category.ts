/**
 * 🏷️ Model: Category (Categorias de Produtos)
 *
 * @module models/Category
 *
 * Classifica produtos em categorias (ex: Auto-Falantes, Componentes, Matéria-Prima).
 * Suporta soft delete via campo active.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export interface CategoryAttributes {
  id: number;
  name: string;
  description: string;
  active: boolean;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const Category = sequelize.define('Category', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(100), allowNull: false, unique: true, comment: 'Nome da categoria' },
  description: { type: DataTypes.TEXT, defaultValue: '', comment: 'Descrição da categoria' },
  active: { type: DataTypes.BOOLEAN, defaultValue: true, comment: 'Status (soft delete)' }
}, {
  tableName: 'product_categories',
  underscored: true,
  timestamps: true
});

export = Category;

