/**
 * 📐 Model: ProductDrawing (Desenhos Técnicos de Produto)
 *
 * @module models/ProductDrawing
 *
 * Gerencia os desenhos técnicos (CAD) de um produto: montagem, detalhe,
 * explodido, esquemático ou BOM. Controla revisão, aprovação e status
 * de ciclo de vida (draft → released → obsolete/canceled).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export interface ProductDrawingAttributes {
  id: number;
  product_id: number;
  drawing_number: string;
  revision: string;
  title: string;
  drawing_type: 'assembly' | 'detail' | 'exploded' | 'schematic' | 'bom';
  file_path: string | null;
  material_spec: string | null;
  dimensions: string | null;
  tolerances: string | null;
  approved_by: number | null;
  approval_date: string | null;
  status: 'draft' | 'released' | 'obsolete' | 'canceled';
  notes: string | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const ProductDrawing = sequelize.define('ProductDrawing', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  product_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK → products.id' },
  drawing_number: { type: DataTypes.STRING(50), allowNull: false, comment: 'Número do desenho técnico' },
  revision: { type: DataTypes.STRING(10), allowNull: false, defaultValue: '00', comment: 'Revisão do desenho' },
  title: { type: DataTypes.STRING(200), allowNull: false },
  drawing_type: { type: DataTypes.ENUM('assembly', 'detail', 'exploded', 'schematic', 'bom'), allowNull: false, defaultValue: 'detail' },
  file_path: { type: DataTypes.STRING(255), allowNull: true, comment: 'Caminho do arquivo CAD/PDF' },
  material_spec: { type: DataTypes.TEXT, allowNull: true },
  dimensions: { type: DataTypes.TEXT, allowNull: true },
  tolerances: { type: DataTypes.TEXT, allowNull: true },
  approved_by: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK → users.id (quem aprovou)' },
  approval_date: { type: DataTypes.DATEONLY, allowNull: true },
  status: { type: DataTypes.ENUM('draft', 'released', 'obsolete', 'canceled'), allowNull: false, defaultValue: 'draft' },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'product_drawings',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['drawing_number', 'revision'], unique: true, name: 'uq_product_drawings_number_revision' },
    { fields: ['product_id'], name: 'idx_product_drawings_product_id' },
    { fields: ['status'], name: 'idx_product_drawings_status' },
  ],
});

export = ProductDrawing;
