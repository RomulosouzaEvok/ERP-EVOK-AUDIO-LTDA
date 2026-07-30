/**
 * Model canônico industrial para a tabela `mrp_ordens_planejadas`.
 *
 * @module models/MrpOrdemPlanejada
 */

import { DataTypes, ModelDefined } from 'sequelize';
import { sequelize } from '../config/database';

export type MrpOrigem = 'PEDIDO_VENDA' | 'PREVISAO' | 'ORDEM_PRODUCAO' | 'MANUAL';
export type OrdemStatus = 'RASCUNHO' | 'APROVADA' | 'EM_EXECUCAO' | 'CONCLUIDA' | 'CANCELADA';

export interface MrpOrdemPlanejadaAttributes {
  id: string;
  item_id: string;
  origem: MrpOrigem;
  origem_id: string | null;
  necessidade_bruta: string;
  estoque_disponivel: string;
  necessidade_liquida: string;
  quantidade_planejada: string;
  data_necessidade: string;
  data_liberacao: string;
  status: OrdemStatus;
  readonly criado_em?: Date;
}

type MrpOrdemPlanejadaCreationAttributes = Omit<MrpOrdemPlanejadaAttributes, 'id' | 'origem_id' | 'status'> &
  Partial<Pick<MrpOrdemPlanejadaAttributes, 'id' | 'origem_id' | 'status'>>;

/**
 * Persistência das ordens planejadas geradas pelo motor de MRP.
 */
const MrpOrdemPlanejada: ModelDefined<MrpOrdemPlanejadaAttributes, MrpOrdemPlanejadaCreationAttributes> = sequelize.define('MrpOrdemPlanejada', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  item_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  origem: {
    type: DataTypes.ENUM('PEDIDO_VENDA', 'PREVISAO', 'ORDEM_PRODUCAO', 'MANUAL'),
    allowNull: false,
  },
  origem_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  necessidade_bruta: {
    type: DataTypes.DECIMAL(18, 6),
    allowNull: false,
    validate: {
      min: 0,
    },
  },
  estoque_disponivel: {
    type: DataTypes.DECIMAL(18, 6),
    allowNull: false,
    validate: {
      min: 0,
    },
  },
  necessidade_liquida: {
    type: DataTypes.DECIMAL(18, 6),
    allowNull: false,
    validate: {
      min: 0,
    },
  },
  quantidade_planejada: {
    type: DataTypes.DECIMAL(18, 6),
    allowNull: false,
    validate: {
      min: 0.000001,
    },
  },
  data_necessidade: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  data_liberacao: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('RASCUNHO', 'APROVADA', 'EM_EXECUCAO', 'CONCLUIDA', 'CANCELADA'),
    allowNull: false,
    defaultValue: 'RASCUNHO',
  },
}, {
  tableName: 'mrp_ordens_planejadas',
  underscored: true,
  createdAt: 'criado_em',
  updatedAt: false,
  indexes: [
    { fields: ['item_id'], name: 'idx_mrp_ordens_planejadas_item' },
    { fields: ['status'], name: 'idx_mrp_ordens_planejadas_status' },
    { fields: ['data_necessidade'], name: 'idx_mrp_ordens_planejadas_data_necessidade' },
    { fields: ['item_id', 'origem', 'origem_id', 'data_necessidade'], unique: true, name: 'uq_mrp_sem_duplicidade' },
  ],
});

export = MrpOrdemPlanejada;
