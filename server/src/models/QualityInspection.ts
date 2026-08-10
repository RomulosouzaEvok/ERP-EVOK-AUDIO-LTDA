/**
 * 🔬 Model: QualityInspection (Inspeção de qualidade por lote — G7)
 *
 * @module models/QualityInspection
 *
 * Tabela `quality_inspections` (migration `20260810-000032`, decisão D-H do
 * dono do produto em 2026-08-10). É o registro que faltava no ERP: até aqui,
 * liberar um lote da quarentena era um clique com observação livre — sem
 * inspetor identificado, sem critério de aceitação, sem resultado.
 *
 * Cobre os dois requisitos da ISO 9001:2015 citados na decisão:
 * - **§8.6** — evidência de conformidade com o critério de aceitação
 *   (`acceptance_criteria`, `verdict`, `defects_found`) e rastreabilidade a
 *   quem autorizou (`inspector_id` aqui; `lot_controls.released_by` no ato da
 *   liberação);
 * - **§8.7** — controle da saída não conforme: `verdict = 'rejected'` abre
 *   RNC e bloqueia o lote pelo caminho já existente
 *   (`CreateNonConformityUseCase`, gaps G8/G10), e
 *   `verdict = 'approved_under_concession'` é a **aceitação sob concessão**,
 *   com `concession_justification` obrigatória — nunca um "release com
 *   observação".
 *
 * ⚠️ Nenhum motor de amostragem Ac/Re está embutido: os níveis de inspeção e
 * o AQL por classe de defeito (ISO 2859-1) são decisão da Engenharia da
 * Qualidade e ainda não foram definidos pelo dono. `sampling_plan`,
 * `lot_size` e `sample_size` são **evidência do que foi aplicado**, não
 * entrada de cálculo. O veredito é sempre humano.
 *
 * ⚠️ Este model NÃO está registrado em `server/src/models/index.ts` (arquivo
 * sob edição concorrente de outros agentes nesta rodada). Ele é carregado
 * diretamente por `SequelizeQualityRepository`, o que é suficiente para
 * `sequelize.define` registrar a tabela; o que falta são apenas as
 * **associações** (`belongsTo` de lote/inspetor/RNC), então as consultas
 * deste módulo não usam `include`. Registro pendente reportado em
 * `docs/governance/TODO.md`.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

/** Estágio do processo em que a inspeção ocorreu. */
type QualityInspectionStage = 'incoming' | 'in_process' | 'final';

/** Veredito do inspetor (ISO 9001 8.6/8.7). */
type QualityInspectionVerdict = 'approved' | 'rejected' | 'approved_under_concession';

interface QualityInspectionAttributes {
  id: number;
  inspection_number: string;
  lot_id: number;
  stage: QualityInspectionStage;
  acceptance_criteria: string;
  sampling_plan: string | null;
  lot_size: number | null;
  sample_size: number | null;
  defects_found: number;
  verdict: QualityInspectionVerdict;
  concession_justification: string | null;
  non_conformity_id: number | null;
  inspector_id: number;
  inspected_at: Date;
  notes: string | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const QualityInspection = sequelize.define<any, QualityInspectionAttributes>('QualityInspection', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  inspection_number: { type: DataTypes.STRING(30), allowNull: false, unique: true, comment: 'Numero legivel da inspecao (INSP-<timestamp>)' },
  lot_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK -> lot_controls.id — toda inspecao e sobre um lote' },
  stage: {
    type: DataTypes.ENUM('incoming', 'in_process', 'final'),
    allowNull: false,
    defaultValue: 'incoming',
    comment: 'incoming (recebimento) | in_process (processo) | final (produto acabado)'
  },
  acceptance_criteria: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'ISO 9001 8.6: criterio de aceitacao aplicado. Texto livre obrigatorio.'
  },
  sampling_plan: {
    type: DataTypes.STRING(120),
    allowNull: true,
    comment: 'Plano de amostragem aplicado (evidencia, sem efeito de calculo — ISO 2859-1 nao esta parametrizada)'
  },
  lot_size: { type: DataTypes.DECIMAL(12, 4), allowNull: true, comment: 'Tamanho do lote inspecionado' },
  sample_size: { type: DataTypes.DECIMAL(12, 4), allowNull: true, comment: 'Tamanho da amostra examinada' },
  defects_found: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, validate: { min: 0 }, comment: 'Defeitos encontrados na amostra' },
  verdict: {
    type: DataTypes.ENUM('approved', 'rejected', 'approved_under_concession'),
    allowNull: false,
    comment: 'Veredito do inspetor. rejected abre RNC e bloqueia o lote; approved_under_concession exige justificativa (ISO 9001 8.7).'
  },
  concession_justification: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'ISO 9001 8.7: obrigatoria quando verdict = approved_under_concession'
  },
  non_conformity_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK -> non_conformities.id aberta na reprovacao' },
  inspector_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK -> users.id — SEMPRE do JWT, nunca do body' },
  inspected_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  notes: { type: DataTypes.TEXT, allowNull: true }
}, {
  tableName: 'quality_inspections',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['lot_id'] },
    { fields: ['verdict'] },
    { fields: ['inspector_id'] }
  ]
});

export = QualityInspection;
