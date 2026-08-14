/**
 * ⚖️ Model: JurContractApproval (Aprovação de contrato por alçada de valor —
 * módulo Jurídico)
 *
 * @module models/JurContractApproval
 *
 * Tabela `jur_contract_approvals` (migration `20260808-000002`, RF-JUR-003).
 * `approver_role` é sempre determinado pelo módulo de acesso do usuário
 * logado (`req.user.permissions.diretor`/`.financeiro`) em
 * `ApproveContractUseCase`, nunca aceito do body. Unique
 * (`contract_id`, `approver_role`) impede duplicidade — um único approval
 * por papel por contrato (constraint `uq_jur_contract_approvals_contract_role`).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type ApproverRole = 'diretor' | 'financeiro';

interface JurContractApprovalAttributes {
  id: number;
  contract_id: number;
  approver_user_id: number;
  approver_role: ApproverRole;
  approved_at: Date;
  /** Valor do contrato NO MOMENTO da aprovação (FIND-ERP-005 Falha 3 — vincula aprovação ao valor aprovado). */
  approved_value: string | null;
  /** Preenchido quando um aditivo eleva a faixa e invalida esta aprovação (histórico preservado). */
  invalidated_at: Date | null;
  invalidated_reason: string | null;
  invalidated_by_addendum_id: number | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const JurContractApproval = sequelize.define<any, JurContractApprovalAttributes>('JurContractApproval', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  contract_id: { type: DataTypes.INTEGER, allowNull: false },
  approver_user_id: { type: DataTypes.INTEGER, allowNull: false },
  approver_role: { type: DataTypes.ENUM('diretor', 'financeiro'), allowNull: false },
  approved_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  approved_value: { type: DataTypes.DECIMAL(18, 6), allowNull: true },
  invalidated_at: { type: DataTypes.DATE, allowNull: true },
  invalidated_reason: { type: DataTypes.TEXT, allowNull: true },
  invalidated_by_addendum_id: { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName: 'jur_contract_approvals',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['contract_id'] },
    // FIND-ERP-005: a unicidade por PAPEL passou a ser um índice único
    // PARCIAL (`WHERE invalidated_at IS NULL`, migration `20260814-000048`),
    // e ganhou uma irmã por PESSOA — o banco antes garantia unicidade só por
    // papel, o que institucionalizava a Falha 4. Índices parciais não são
    // expressáveis aqui; ficam na migration e são a fonte de verdade.
  ],
});

export = JurContractApproval;
