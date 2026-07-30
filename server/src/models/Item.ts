/**
 * Model canônico industrial para a tabela `items`.
 *
 * @module models/Item
 */

import { DataTypes, ModelDefined } from 'sequelize';
import { sequelize } from '../config/database';

export type ItemTipo = 'MATERIA_PRIMA' | 'SUBCONJUNTO' | 'PRODUTO_ACABADO';
export type ItemStatus = 'ATIVO' | 'INATIVO' | 'BLOQUEADO';

export interface ItemAttributes {
  id: string;
  codigo: string;
  descricao: string;
  tipo: ItemTipo;
  unidade: string;
  status: ItemStatus;
  estoque_atual: string;
  estoque_reservado: string;
  estoque_seguranca: string;
  lote_minimo: string;
  lead_time_dias: number;
  custo_padrao: string;
  fornecedor_padrao_id: string | null;
  readonly criado_em?: Date;
  readonly atualizado_em?: Date;
}

type ItemCreationAttributes = Omit<
  ItemAttributes,
  'id' | 'status' | 'estoque_atual' | 'estoque_reservado' | 'estoque_seguranca' | 'lote_minimo' | 'lead_time_dias' | 'custo_padrao'
> & Partial<Pick<ItemAttributes, 'id' | 'status' | 'estoque_atual' | 'estoque_reservado' | 'estoque_seguranca' | 'lote_minimo' | 'lead_time_dias' | 'custo_padrao'>>;

/**
 * Representa o cadastro mestre industrial usado por BOM, MRP e rastreabilidade.
 */
const Item: ModelDefined<ItemAttributes, ItemCreationAttributes> = sequelize.define('Item', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  codigo: {
    type: DataTypes.STRING(80),
    allowNull: false,
    unique: true,
  },
  descricao: {
    type: DataTypes.STRING(240),
    allowNull: false,
  },
  tipo: {
    type: DataTypes.ENUM('MATERIA_PRIMA', 'SUBCONJUNTO', 'PRODUTO_ACABADO'),
    allowNull: false,
  },
  unidade: {
    type: DataTypes.STRING(12),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('ATIVO', 'INATIVO', 'BLOQUEADO'),
    allowNull: false,
    defaultValue: 'ATIVO',
  },
  estoque_atual: {
    type: DataTypes.DECIMAL(18, 6),
    allowNull: false,
    defaultValue: 0,
  },
  estoque_reservado: {
    type: DataTypes.DECIMAL(18, 6),
    allowNull: false,
    defaultValue: 0,
  },
  estoque_seguranca: {
    type: DataTypes.DECIMAL(18, 6),
    allowNull: false,
    defaultValue: 0,
  },
  lote_minimo: {
    type: DataTypes.DECIMAL(18, 6),
    allowNull: false,
    defaultValue: 0,
  },
  lead_time_dias: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  custo_padrao: {
    type: DataTypes.DECIMAL(18, 6),
    allowNull: false,
    defaultValue: 0,
  },
  fornecedor_padrao_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  tableName: 'items',
  underscored: true,
  createdAt: 'criado_em',
  updatedAt: 'atualizado_em',
  indexes: [
    { fields: ['codigo'], unique: true, name: 'idx_items_codigo_unique' },
    { fields: ['tipo'], name: 'idx_items_tipo' },
    { fields: ['status'], name: 'idx_items_status' },
    { fields: ['fornecedor_padrao_id'], name: 'idx_items_fornecedor_padrao' },
  ],
});

export = Item;
