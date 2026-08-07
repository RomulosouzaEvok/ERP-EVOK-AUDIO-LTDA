/**
 * 🖼️ Model: MarketingMaterial (Material de Divulgação — Marketing)
 *
 * @module models/MarketingMaterial
 *
 * Material de divulgação (catálogo, flyer, banner, vídeo, manual, ficha
 * técnica, apresentação) do módulo Marketing (departamento 14, sigla MKT),
 * opcionalmente vinculado a um `Item` (`product_id` nullable — material
 * pode ser institucional/de marca, sem produto específico). `file_path`
 * segue o mesmo padrão de armazenamento local em `uploads/` usado pelo
 * restante do projeto (`services/uploadService`), populado via
 * `POST /api/marketing/materials/:id/file`.
 *
 * `product_id`/`stock_item_id` são `UUID` (não `INTEGER`): `items.id` é
 * UUID no schema real (`server/src/models/Item.ts`), mesmo padrão de
 * `sst_tipo_epi.item_id`. `stock_item_id` (BLOCO 5 MKT correção,
 * RF-MKT-038) referencia o item de Almoxarifado (categoria "Material
 * Promocional") do material físico — nenhuma movimentação de estoque é
 * criada por este módulo (BR-MKT-011 mantida).
 *
 * Aprovação (RF-MKT-039/040): material nasce sempre `approved=false`
 * (`createMaterialSchema` não aceita `approved` no `POST`); só
 * `PATCH /api/marketing/materials/:id/approve` grava
 * `approved=true`/`approved_by`/`approved_at`. Upload de nova versão sobre
 * material já aprovado reverte `approved`/`approved_by`/`approved_at`.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type MarketingMaterialType =
  | 'catalog' | 'flyer' | 'banner' | 'video' | 'manual' | 'technical_sheet' | 'presentation';

interface MarketingMaterialAttributes {
  id: number;
  title: string;
  material_type: MarketingMaterialType;
  product_id: string | null;
  stock_item_id: string | null;
  file_path: string | null;
  version: string;
  approved: boolean;
  approved_by: number | null;
  approved_at: Date | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const MarketingMaterial = sequelize.define('MarketingMaterial', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title: { type: DataTypes.STRING(200), allowNull: false },
  material_type: {
    type: DataTypes.ENUM('catalog', 'flyer', 'banner', 'video', 'manual', 'technical_sheet', 'presentation'),
    allowNull: false,
  },
  product_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'items', key: 'id' },
  },
  stock_item_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'items', key: 'id' },
  },
  file_path: { type: DataTypes.STRING(255), allowNull: true },
  version: { type: DataTypes.STRING(10), allowNull: false, defaultValue: '01' },
  approved: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  approved_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'users', key: 'id' },
  },
  approved_at: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'marketing_materials',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['product_id'], name: 'idx_marketing_materials_product_id' },
    { fields: ['stock_item_id'], name: 'idx_marketing_materials_stock_item_id' },
    { fields: ['material_type'], name: 'idx_marketing_materials_material_type' },
  ],
});

export = MarketingMaterial;
