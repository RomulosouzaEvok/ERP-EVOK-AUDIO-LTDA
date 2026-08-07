/**
 * 🦺 Model: SstRiscoOcupacional (Inventário de riscos do PGR/GRO, NR-1)
 *
 * @module models/SstRiscoOcupacional
 *
 * Tabela `sst_riscos_ocupacionais` (migration `20260806-000139`).
 * `ausencia_risco_identificado = true` exige `categoria_agente`/`agente`
 * NULOS (RF-SST-036/BR-SST-026); CHECK
 * `ck_sst_riscos_ocupacionais_ausencia_coerente` garante essa coerência
 * no banco — o use case deve refletir a mesma regra antes do INSERT.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type RiscoCategoriaAgente = 'fisico' | 'quimico' | 'biologico' | 'ergonomico' | 'mecanico_acidente';

interface SstRiscoOcupacionalAttributes {
  id: number;
  department_id: number;
  ges_id: number | null;
  categoria_agente: RiscoCategoriaAgente | null;
  agente: string | null;
  fonte_geradora: string | null;
  intensidade_concentracao: string | null;
  data_medicao: string | null;
  medido_por: string | null;
  severidade: number | null;
  probabilidade: number | null;
  classificacao_resultante: string | null;
  medidas_controle: string | null;
  ausencia_risco_identificado: boolean;
  data_revisao: string | null;
  proxima_revisao_prevista: string | null;
  created_by: number;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const SstRiscoOcupacional = sequelize.define<any, SstRiscoOcupacionalAttributes>('SstRiscoOcupacional', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  department_id: { type: DataTypes.INTEGER, allowNull: false },
  ges_id: { type: DataTypes.INTEGER, allowNull: true },
  categoria_agente: { type: DataTypes.ENUM('fisico', 'quimico', 'biologico', 'ergonomico', 'mecanico_acidente'), allowNull: true },
  agente: { type: DataTypes.STRING(150), allowNull: true },
  fonte_geradora: { type: DataTypes.STRING(200), allowNull: true },
  intensidade_concentracao: { type: DataTypes.STRING(100), allowNull: true },
  data_medicao: { type: DataTypes.DATEONLY, allowNull: true },
  medido_por: { type: DataTypes.STRING(150), allowNull: true },
  severidade: { type: DataTypes.INTEGER, allowNull: true },
  probabilidade: { type: DataTypes.INTEGER, allowNull: true },
  classificacao_resultante: { type: DataTypes.STRING(50), allowNull: true },
  medidas_controle: { type: DataTypes.TEXT, allowNull: true },
  ausencia_risco_identificado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  data_revisao: { type: DataTypes.DATEONLY, allowNull: true },
  proxima_revisao_prevista: { type: DataTypes.DATEONLY, allowNull: true },
  created_by: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK -> users.id' }
}, {
  tableName: 'sst_riscos_ocupacionais',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['department_id'] },
    { fields: ['ges_id'] },
    { fields: ['proxima_revisao_prevista'] }
  ]
});

export = SstRiscoOcupacional;
