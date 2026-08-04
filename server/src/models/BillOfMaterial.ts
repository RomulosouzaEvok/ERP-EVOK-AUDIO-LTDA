/**
 * 📦 Model: BillOfMaterial (Estrutura do Produto - BOM)
 *
 * @module models/BillOfMaterial
 *
 * Define a composição de um produto acabado ou subconjunto.
 * Suporta versionamento (revision), aprovação (status) e
 * hierarquia multinível via BillOfMaterialItems.
 *
 * Regras de Negócio:
 * - Um produto pode ter múltiplas BOMs (versões)
 * - BOMs são versionadas por revision
 * - Status: draft → active (aprovada) → superseded (substituída)
 * - BOM active é a vigente para produção
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface BillOfMaterialAttributes {
  id: number;
  product_id: number;
  revision: string;
  revision_date: string;
  revision_notes: string | null;
  status: 'draft' | 'active' | 'inactive' | 'superseded';
  created_by: number | null;
  approved_by: number | null;
  approval_date: string | null;
  notes: string | null;
  total_components: number;
  total_cost: number;
  manufacturing_time_minutes: number;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const BillOfMaterial = sequelize.define('BillOfMaterial', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, comment: 'Identificador único da BOM' },
  product_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK → Product.id. Produto ao qual esta BOM pertence' },
  revision: { type: DataTypes.STRING(10), defaultValue: '00', comment: 'Revisão da BOM (00, 01, A, B...)' },
  revision_date: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW, comment: 'Data de efetivação desta revisão' },
  revision_notes: { type: DataTypes.TEXT, comment: 'Notas de alteração da revisão' },
  status: { type: DataTypes.ENUM('draft', 'active', 'inactive', 'superseded'), defaultValue: 'draft', comment: 'Status: draft=rascunho, active=vigente, inactive=desativada, superseded=substituída' },
  created_by: { type: DataTypes.INTEGER, comment: 'FK → User.id (criador)' },
  approved_by: { type: DataTypes.INTEGER, comment: 'FK → User.id (aprovador)' },
  approval_date: { type: DataTypes.DATEONLY, comment: 'Data de aprovação' },
  notes: { type: DataTypes.TEXT, comment: 'Observações técnicas gerais' },
  total_components: { type: DataTypes.INTEGER, defaultValue: 0, comment: 'Cache: total de itens distintos' },
  total_cost: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0, comment: 'Cache: custo total calculado' },
  manufacturing_time_minutes: { type: DataTypes.INTEGER, defaultValue: 0, comment: 'Cache: tempo total de fabricação (min)' }
}, {
  tableName: 'bill_of_materials',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['product_id'], name: 'idx_bom_product' },
    { fields: ['status'], name: 'idx_bom_status' },
    { fields: ['product_id', 'status'], name: 'idx_bom_product_active' }
  ]
});

export = BillOfMaterial;
