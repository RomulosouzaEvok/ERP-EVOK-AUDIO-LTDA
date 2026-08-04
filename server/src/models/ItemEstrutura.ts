/**
 * Model canônico industrial para a tabela `item_estruturas`.
 *
 * @module models/ItemEstrutura
 */

import { DataTypes, ModelDefined } from 'sequelize';
import { sequelize } from '../config/database';

type ItemEstruturaStatus = 'draft' | 'active' | 'inactive' | 'superseded';
type ItemEstruturaComponentType = 'raw_material' | 'component' | 'semi_finished' | 'packaging' | 'consumable' | 'other';

interface ItemEstruturaAttributes {
  id: string;
  item_pai_id: string;
  item_componente_id: string;
  quantidade: string;
  perda_percentual: string;
  nivel: number;
  sequencia: number;
  ativo: boolean;
  revisao: string;
  observacoes: string | null;
  criado_por: number | null;
  status: ItemEstruturaStatus;
  approved_by: number | null;
  approval_date: Date | null;
  unit_cost: string;
  total_cost: string;
  parent_item_estrutura_id: string | null;
  component_type: ItemEstruturaComponentType;
  is_critical: boolean;
  alternative_product_id: string | null;
  readonly criado_em?: Date;
  readonly atualizado_em?: Date;
}

type ItemEstruturaCreationAttributes = Omit<
  ItemEstruturaAttributes,
  'id' | 'perda_percentual' | 'nivel' | 'sequencia' | 'ativo' | 'revisao' | 'observacoes' | 'criado_por' | 'status' | 'approved_by' | 'approval_date' | 'unit_cost' | 'total_cost' | 'parent_item_estrutura_id' | 'component_type' | 'is_critical' | 'alternative_product_id'
> & Partial<Pick<ItemEstruturaAttributes, 'id' | 'perda_percentual' | 'nivel' | 'sequencia' | 'ativo' | 'revisao' | 'observacoes' | 'criado_por' | 'status' | 'approved_by' | 'approval_date' | 'unit_cost' | 'total_cost' | 'parent_item_estrutura_id' | 'component_type' | 'is_critical' | 'alternative_product_id'>>;

/**
 * Representa o vínculo de estrutura multinível entre item pai e item componente.
 */
const ItemEstrutura: ModelDefined<ItemEstruturaAttributes, ItemEstruturaCreationAttributes> = sequelize.define('ItemEstrutura', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  item_pai_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  item_componente_id: {
    type: DataTypes.UUID,
    allowNull: false,
    validate: {
      isDifferentFromParent(value: string) {
        if (value === (this as ItemEstruturaAttributes).item_pai_id) {
          throw new Error('item_pai_id nao pode ser igual a item_componente_id');
        }
      },
    },
  },
  quantidade: {
    type: DataTypes.DECIMAL(18, 6),
    allowNull: false,
    validate: {
      min: 0.000001,
    },
  },
  perda_percentual: {
    type: DataTypes.DECIMAL(9, 6),
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0,
    },
  },
  nivel: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: {
      min: 1,
    },
  },
  sequencia: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  ativo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  revisao: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: '00',
  },
  observacoes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  criado_por: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'users', key: 'id' },
  },
  status: {
    type: DataTypes.ENUM('draft', 'active', 'inactive', 'superseded'),
    allowNull: false,
    defaultValue: 'active',
    comment: 'Workflow status de versão de BOM (draft→active→inactive/superseded)',
  },
  approved_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    comment: 'FK para usuario que aprovou esta estrutura',
  },
  approval_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Data de aprovação',
  },
  unit_cost: {
    type: DataTypes.DECIMAL(18, 6),
    allowNull: false,
    defaultValue: 0,
    comment: 'Custo unitário do componente (cache)',
  },
  total_cost: {
    type: DataTypes.DECIMAL(18, 6),
    allowNull: false,
    defaultValue: 0,
    comment: 'Custo total: quantity × unit_cost × (1 + scrap%) (cache)',
  },
  parent_item_estrutura_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'FK para ItemEstrutura pai (para sub-BOMs)',
  },
  component_type: {
    type: DataTypes.ENUM('raw_material', 'component', 'semi_finished', 'packaging', 'consumable', 'other'),
    allowNull: false,
    defaultValue: 'component',
    comment: 'Tipo de componente',
  },
  is_critical: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Flag: item crítico (single supplier, long lead time)',
  },
  alternative_product_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'FK para Item alternativo aprovado',
  },
}, {
  tableName: 'item_estruturas',
  underscored: true,
  createdAt: 'criado_em',
  updatedAt: 'atualizado_em',
  indexes: [
    { fields: ['item_pai_id'], name: 'idx_item_estruturas_item_pai' },
    { fields: ['item_componente_id'], name: 'idx_item_estruturas_item_componente' },
    { fields: ['ativo'], name: 'idx_item_estruturas_ativo' },
    { fields: ['item_pai_id', 'item_componente_id', 'revisao'], unique: true, name: 'uq_item_estruturas_ativa' },
    { fields: ['status'], name: 'idx_item_estruturas_status' },
    { fields: ['approved_by'], name: 'idx_item_estruturas_approved_by' },
    { fields: ['parent_item_estrutura_id'], name: 'idx_item_estruturas_parent_item' },
    { fields: ['component_type'], name: 'idx_item_estruturas_component_type' },
    { fields: ['is_critical'], name: 'idx_item_estruturas_is_critical' },
    { fields: ['parent_item_estrutura_id', 'sequencia'], name: 'idx_item_estruturas_parent_sequencia' },
    { fields: ['item_pai_id', 'status'], name: 'idx_item_estruturas_pai_status' },
  ],
});

export = ItemEstrutura;
