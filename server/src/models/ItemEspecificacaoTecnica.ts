/**
 * Model para especificações técnicas de itens (extensão 1:1 opcional de Item).
 * Suporta múltiplas famílias de produtos via discriminador `familia_tecnica`.
 * Tabela: `item_especificacoes_tecnicas`
 *
 * @module models/ItemEspecificacaoTecnica
 */

import { DataTypes, ModelDefined } from 'sequelize';
import { sequelize } from '../config/database';

export type FamiliaTecinicaType = 'ALTO_FALANTE' | 'CABO' | 'AMPLIFICADOR' | 'TRANSFORMADOR' | 'CAPACITOR' | string;

export interface ItemEspecificacaoTecnicaAttributes {
  item_id: string;
  familia_tecnica: string;
  atributos: Record<string, any>;
  readonly criado_em?: Date;
  readonly atualizado_em?: Date;
}

type ItemEspecificacaoTecnicaCreationAttributes = Omit<ItemEspecificacaoTecnicaAttributes, 'criado_em' | 'atualizado_em'>;

const ItemEspecificacaoTecnica: ModelDefined<ItemEspecificacaoTecnicaAttributes, ItemEspecificacaoTecnicaCreationAttributes> = sequelize.define('ItemEspecificacaoTecnica', {
  item_id: {
    type: DataTypes.UUID,
    primaryKey: true,
    allowNull: false,
    comment: 'Referência ao Item (FK para items.id)',
  },
  familia_tecnica: {
    type: DataTypes.VARCHAR(40),
    allowNull: false,
    comment: 'Família/tipo de especificação técnica (ex: ALTO_FALANTE, CABO, AMPLIFICADOR)',
  },
  atributos: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
    comment: 'JSON com atributos específicos da família (ex: Thiele-Small para ALTO_FALANTE)',
  },
}, {
  tableName: 'item_especificacoes_tecnicas',
  underscored: true,
  createdAt: 'criado_em',
  updatedAt: 'atualizado_em',
  indexes: [
    { fields: ['familia_tecnica'], name: 'idx_item_especificacoes_tecnicas_familia' },
    {
      fields: ['atributos'],
      using: 'GIN',
      operator: 'jsonb_path_ops',
      name: 'idx_item_especificacoes_tecnicas_atributos_gin',
    },
  ],
});

export = ItemEspecificacaoTecnica;
