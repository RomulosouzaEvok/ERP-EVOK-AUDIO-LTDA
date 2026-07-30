/**
 * Model para detalhes comerciais/fiscais de itens (extensão 1:1 de Item).
 * Tabela: `item_detalhes_comerciais`
 *
 * @module models/ItemDetalheComercial
 */

import { DataTypes, ModelDefined } from 'sequelize';
import { sequelize } from '../config/database';

export interface ItemDetalheComercialAttributes {
  item_id: string;
  preco_venda: string;
  categoria_id: string | null;
  ncm: string;
  cest: string | null;
  peso_kg: string;
  localizacao_estoque: string | null;
  numero_desenho: string | null;
  revisao_tecnica: string;
  lote_rastreabilidade: string | null;
  numero_serie: string | null;
  readonly criado_em?: Date;
  readonly atualizado_em?: Date;
}

type ItemDetalheComercialCreationAttributes = Omit<ItemDetalheComercialAttributes, 'criado_em' | 'atualizado_em'>;

const ItemDetalheComercial: ModelDefined<ItemDetalheComercialAttributes, ItemDetalheComercialCreationAttributes> = sequelize.define('ItemDetalheComercial', {
  item_id: {
    type: DataTypes.UUID,
    primaryKey: true,
    allowNull: false,
    comment: 'Referência ao Item (FK para items.id)',
  },
  preco_venda: {
    type: DataTypes.DECIMAL(14, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Preço de venda em moeda local',
  },
  categoria_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Referência a ItemCategoria (FK para item_categorias.id)',
  },
  ncm: {
    type: DataTypes.STRING(10),
    allowNull: false,
    defaultValue: '85182100',
    comment: 'Nomenclatura Comum do Mercosul para fins fiscais',
  },
  cest: {
    type: DataTypes.STRING(10),
    allowNull: true,
    comment: 'Código de Especificação da Substituição Tributária (CEST)',
  },
  peso_kg: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: false,
    defaultValue: 0,
    comment: 'Peso em quilogramas',
  },
  localizacao_estoque: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Localização física no depósito/armazém',
  },
  numero_desenho: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Número de desenho ou referência técnica do produto',
  },
  revisao_tecnica: {
    type: DataTypes.STRING(10),
    allowNull: false,
    defaultValue: '00',
    comment: 'Revisão técnica/versão do desenho',
  },
  lote_rastreabilidade: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Lote para rastreabilidade',
  },
  numero_serie: {
    type: DataTypes.STRING(80),
    allowNull: true,
    comment: 'Número de série para rastreabilidade',
  },
}, {
  tableName: 'item_detalhes_comerciais',
  underscored: true,
  createdAt: 'criado_em',
  updatedAt: 'atualizado_em',
  indexes: [
    { fields: ['categoria_id'], name: 'idx_item_detalhes_comerciais_categoria_id' },
    { fields: ['ncm'], name: 'idx_item_detalhes_comerciais_ncm' },
  ],
});

export = ItemDetalheComercial;
