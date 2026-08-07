/**
 * 🦺 Model: SstAcaoCorretiva (Ação corretiva, recurso polimórfico multi-origem)
 *
 * @module models/SstAcaoCorretiva
 *
 * Tabela `sst_acoes_corretivas` (migration `20260806-000132`). `origem_tipo`
 * + `origem_id` são polimórficos (sem FK de banco) — a integridade é
 * responsabilidade do use case que cria a ação (sempre a partir de uma
 * transação que já tem a origem carregada em memória).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type AcaoCorretivaOrigemTipo = 'investigacao_acidente' | 'reuniao_cipa' | 'inspecao_seguranca' | 'pgr';
type AcaoCorretivaStatus = 'aberta' | 'em_andamento' | 'concluida' | 'atrasada';

interface SstAcaoCorretivaAttributes {
  id: number;
  origem_tipo: AcaoCorretivaOrigemTipo;
  origem_id: number;
  descricao: string;
  responsavel_id: number;
  prazo: string;
  status: AcaoCorretivaStatus;
  evidencia_conclusao_url: string | null;
  concluida_em: Date | null;
  created_by: number;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const SstAcaoCorretiva = sequelize.define<any, SstAcaoCorretivaAttributes>('SstAcaoCorretiva', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  origem_tipo: { type: DataTypes.ENUM('investigacao_acidente', 'reuniao_cipa', 'inspecao_seguranca', 'pgr'), allowNull: false },
  origem_id: { type: DataTypes.INTEGER, allowNull: false },
  descricao: { type: DataTypes.TEXT, allowNull: false },
  responsavel_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK -> employees.id' },
  prazo: { type: DataTypes.DATEONLY, allowNull: false },
  status: { type: DataTypes.ENUM('aberta', 'em_andamento', 'concluida', 'atrasada'), allowNull: false, defaultValue: 'aberta' },
  evidencia_conclusao_url: DataTypes.STRING(255),
  concluida_em: DataTypes.DATE,
  created_by: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK -> users.id' }
}, {
  tableName: 'sst_acoes_corretivas',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['origem_tipo', 'origem_id'] },
    { fields: ['responsavel_id'] },
    { fields: ['status', 'prazo'] }
  ]
});

export = SstAcaoCorretiva;
