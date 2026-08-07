/**
 * 🦺 Model: SstEventoEsocial (Fila S-2210/S-2220/S-2240)
 *
 * @module models/SstEventoEsocial
 *
 * Tabela `sst_eventos_esocial` (migration `20260806-000137`). Origem
 * polimórfica (`origem_tipo`+`origem_id`, sem FK de banco). DELETE sempre
 * bloqueado por trigger (`sst_block_delete_evento_esocial`,
 * RNF-SST-03) — a fila nunca perde/descarta um evento. Índice único
 * parcial `uq_sst_eventos_esocial_origem_ativo` garante no máximo 1 evento
 * "ativo" (status ≠ rejeitado) por origem.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type EsocialTipo = 'S-2210' | 'S-2220' | 'S-2240';
type EsocialOrigemTipo = 'cat' | 'aso' | 'ges_funcionario';
type EsocialStatus = 'pendente' | 'enviado' | 'aceito' | 'rejeitado';

interface SstEventoEsocialAttributes {
  id: number;
  tipo: EsocialTipo;
  origem_tipo: EsocialOrigemTipo;
  origem_id: number;
  payload_referencia: string | null;
  prazo_legal: string | null;
  status: EsocialStatus;
  recibo: string | null;
  motivo_rejeicao: string | null;
  data_envio: Date | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const SstEventoEsocial = sequelize.define<any, SstEventoEsocialAttributes>('SstEventoEsocial', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tipo: { type: DataTypes.ENUM('S-2210', 'S-2220', 'S-2240'), allowNull: false },
  origem_tipo: { type: DataTypes.ENUM('cat', 'aso', 'ges_funcionario'), allowNull: false },
  origem_id: { type: DataTypes.INTEGER, allowNull: false },
  payload_referencia: DataTypes.TEXT,
  prazo_legal: DataTypes.DATEONLY,
  status: { type: DataTypes.ENUM('pendente', 'enviado', 'aceito', 'rejeitado'), allowNull: false, defaultValue: 'pendente' },
  recibo: DataTypes.STRING(80),
  motivo_rejeicao: DataTypes.TEXT,
  data_envio: DataTypes.DATE
}, {
  tableName: 'sst_eventos_esocial',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['tipo'] },
    { fields: ['origem_tipo', 'origem_id'] },
    { fields: ['status'] },
    { fields: ['prazo_legal'] }
  ]
});

export = SstEventoEsocial;
