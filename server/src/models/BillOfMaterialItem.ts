/**
 * 📦 Model: BillOfMaterialItem (Item da Estrutura do Produto - BOM Item)
 *
 * @module models/BillOfMaterialItem
 *
 * Representa um componente dentro da BOM com quantidade, nível hierárquico,
 * custo, perda técnica e ordem de montagem.
 *
 * Hierarquia de Níveis:
 * - Nível 0: Produto acabado
 * - Nível 1: Subconjuntos e componentes diretos
 * - Nível 2+: Subcomponentes (detalhamento)
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface BillOfMaterialItemAttributes {
  id: number;
  bom_id: number;
  component_product_id: number;
  item_id?: string | null;
  quantity: number;
  unit: string;
  bom_level: number;
  parent_item_id: number | null;
  sequence_order: number;
  component_type: 'raw_material' | 'component' | 'semi_finished' | 'packaging' | 'consumable' | 'other';
  scrap_percentage: number;
  unit_cost: number;
  total_cost: number;
  notes: string | null;
  alternative_product_id: number | null;
  is_critical: boolean;
  is_phantom: boolean;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const BillOfMaterialItem = sequelize.define('BillOfMaterialItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, comment: 'Identificador único do item da BOM' },
  bom_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK → bill_of_materials.id' },
  component_product_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK → Product.id (o componente, LEGADO)' },
  item_id: { type: DataTypes.UUID, allowNull: true, comment: 'FK → items.id (NOVO, parallel to component_product_id)' },
  quantity: {
    type: DataTypes.DECIMAL(12, 4),
    allowNull: false,
    defaultValue: 1,
    validate: {
      min: 0.0001,
      isPositive(value: string) {
        if (parseFloat(value) <= 0) throw new Error('Quantidade deve ser maior que zero');
      }
    },
    comment: 'Quantidade para UMA unidade do produto pai'
  },
  unit: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'un', comment: 'Unidade: un, g, kg, m, l' },
  bom_level: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1, validate: { min: 0, max: 10 }, comment: 'Nível hierárquico (0=produto final)' },
  parent_item_id: { type: DataTypes.INTEGER, allowNull: true, defaultValue: null, comment: 'Auto-relacionamento: item pai. NULL em componente de 1º nível (FK fk_bom_items_parent_item_id é ON DELETE SET NULL). NOT NULL indevido removido na migration 20260810-000028' },
  sequence_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, comment: 'Ordem de montagem' },
  component_type: { type: DataTypes.ENUM('raw_material', 'component', 'semi_finished', 'packaging', 'consumable', 'other'), allowNull: false, defaultValue: 'component' },
  scrap_percentage: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0, validate: { min: 0, max: 100 }, comment: '% de perda técnica esperada' },
  unit_cost: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0, comment: 'Custo unitário (cache)' },
  total_cost: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0, comment: 'Custo total (cache: qtd × unit_cost + scrap)' },
  notes: { type: DataTypes.TEXT, allowNull: true, comment: 'Observações específicas do item (opcional; NOT NULL indevido removido na migration 20260810-000028)' },
  alternative_product_id: { type: DataTypes.INTEGER, allowNull: true, defaultValue: null, comment: 'FK → Product.id (substituto aprovado, opcional; FK é ON DELETE SET NULL). NOT NULL indevido removido na migration 20260810-000028' },
  is_critical: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, comment: 'Item crítico (único fornecedor, lead time longo)' },
  is_phantom: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'G18: false = subconjunto ESTOCÁVEL (a explosão para nele; a OP do pai consome a peça pronta — caso do REPARO). true = subconjunto FANTASMA (a explosão desce e o pai consome os filhos). Só tem efeito quando o componente tem BOM ativa própria.'
  }
}, {
  tableName: 'bill_of_material_items',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['bom_id'], name: 'idx_bom_item_bom' },
    { fields: ['component_product_id'], name: 'idx_bom_item_component' },
    { fields: ['item_id'], name: 'idx_bom_item_item_id' },
    { fields: ['item_id', 'bom_id'], name: 'idx_bom_item_item_id_bom' },
    { fields: ['bom_id', 'bom_level'], name: 'idx_bom_item_level' },
    { fields: ['parent_item_id'], name: 'idx_bom_item_parent' }
  ]
});

export = BillOfMaterialItem;
