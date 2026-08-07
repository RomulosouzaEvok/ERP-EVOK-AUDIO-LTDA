/**
 * 🦺 Model: SstEntregaEpi (Ficha de EPI — entrega ao funcionário, NR-6)
 *
 * @module models/SstEntregaEpi
 *
 * Tabela `sst_entregas_epi` (migration `20260806-000131`). **Imutável após
 * `confirmada = true`** via trigger Postgres `sst_lock_entrega_epi`
 * (RNF-SST-01/BR-SST-006) — nenhum UPDATE/DELETE é permitido pela
 * aplicação nesse estado; o repositório desta entidade NUNCA expõe
 * `update`/`delete` para uma entrega confirmada (o use case de confirmação
 * é o único caminho de escrita pós-criação, além da evidência em rascunho).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type EntregaEpiMotivo = 'primeira_entrega' | 'troca_periodica' | 'dano' | 'perda' | 'mudanca_funcao';
type EntregaEpiEvidenciaTipo = 'assinatura_digitalizada' | 'aceite_eletronico' | 'biometria';

interface SstEntregaEpiAttributes {
  id: number;
  employee_id: number;
  tipo_epi_id: number;
  quantidade: string;
  data_entrega: string;
  motivo: EntregaEpiMotivo;
  data_prevista_troca: string | null;
  evidencia_tipo: EntregaEpiEvidenciaTipo | null;
  evidencia_arquivo_url: string | null;
  confirmada: boolean;
  confirmada_em: Date | null;
  inventory_movement_id: number | null;
  entregue_por: number;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const SstEntregaEpi = sequelize.define<any, SstEntregaEpiAttributes>('SstEntregaEpi', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  employee_id: { type: DataTypes.INTEGER, allowNull: false },
  tipo_epi_id: { type: DataTypes.INTEGER, allowNull: false },
  quantidade: { type: DataTypes.DECIMAL(18, 6), allowNull: false },
  data_entrega: { type: DataTypes.DATEONLY, allowNull: false },
  motivo: { type: DataTypes.ENUM('primeira_entrega', 'troca_periodica', 'dano', 'perda', 'mudanca_funcao'), allowNull: false },
  data_prevista_troca: DataTypes.DATEONLY,
  evidencia_tipo: DataTypes.ENUM('assinatura_digitalizada', 'aceite_eletronico', 'biometria'),
  evidencia_arquivo_url: DataTypes.STRING(255),
  confirmada: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  confirmada_em: DataTypes.DATE,
  inventory_movement_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK -> inventory_movements.id' },
  entregue_por: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK -> users.id' }
}, {
  tableName: 'sst_entregas_epi',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['employee_id'] },
    { fields: ['tipo_epi_id'] },
    { fields: ['data_prevista_troca'] },
    { fields: ['confirmada'] }
  ]
});

export = SstEntregaEpi;
