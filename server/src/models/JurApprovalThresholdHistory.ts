/**
 * ⚖️ Model: JurApprovalThresholdHistory — histórico/auditoria das alterações
 * da política de alçada de contrato jurídico.
 *
 * Tabela `jur_approval_threshold_history` (migration `20260814-000048`).
 * Existe porque a decisão do dono (`APR-2026-021` Parte B, decisão 3) exige
 * nominalmente **"histórico/auditoria das alterações"** como requisito
 * mínimo da tabela configurável — sem isso, a Falha 1 de `FIND-ERP-005`
 * (impossível auditar sob qual regra um contrato foi ativado) só teria sido
 * meio corrigida.
 *
 * Cada linha guarda o estado ANTERIOR e o NOVO, quem alterou (`changed_by`,
 * sempre do JWT) e o motivo. É append-only por convenção de uso: nenhum
 * caminho da aplicação atualiza ou apaga linhas desta tabela.
 *
 * @module models/JurApprovalThresholdHistory
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type ThresholdHistoryAction = 'seed' | 'create' | 'update' | 'deactivate' | 'replace';

interface JurApprovalThresholdHistoryAttributes {
  id: number;
  threshold_id: number | null;
  action: ThresholdHistoryAction;
  previous_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  changed_by: number | null;
  change_reason: string | null;
  changed_at: Date;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const JurApprovalThresholdHistory = sequelize.define<any, JurApprovalThresholdHistoryAttributes>('JurApprovalThresholdHistory', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  threshold_id: { type: DataTypes.INTEGER, allowNull: true },
  action: { type: DataTypes.STRING(16), allowNull: false },
  previous_values: { type: DataTypes.JSONB, allowNull: true },
  new_values: { type: DataTypes.JSONB, allowNull: true },
  changed_by: { type: DataTypes.INTEGER, allowNull: true },
  change_reason: { type: DataTypes.TEXT, allowNull: true },
  changed_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: 'jur_approval_threshold_history',
  underscored: true,
  timestamps: true,
  indexes: [{ fields: ['threshold_id'] }],
});

export = JurApprovalThresholdHistory;
