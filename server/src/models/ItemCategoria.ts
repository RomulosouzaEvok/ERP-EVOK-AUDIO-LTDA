/**
 * Model canônico para categorias de itens da tabela `item_categorias`.
 *
 * @module models/ItemCategoria
 */

import { DataTypes, ModelDefined } from 'sequelize';
import { sequelize } from '../config/database';

export interface ItemCategoriaAttributes {
  id: string;
  codigo: string;
  descricao: string;
  readonly criado_em?: Date;
  readonly atualizado_em?: Date;
}

type ItemCategoriaCreationAttributes = Omit<ItemCategoriaAttributes, 'id'> & Partial<Pick<ItemCategoriaAttributes, 'id'>>;

const ItemCategoria: ModelDefined<ItemCategoriaAttributes, ItemCategoriaCreationAttributes> = sequelize.define('ItemCategoria', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  codigo: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
  descricao: {
    type: DataTypes.STRING(240),
    allowNull: false,
  },
}, {
  tableName: 'item_categorias',
  underscored: true,
  createdAt: 'criado_em',
  updatedAt: 'atualizado_em',
  indexes: [
    { fields: ['codigo'], unique: true, name: 'idx_item_categorias_codigo_unique' },
  ],
});

export = ItemCategoria;
