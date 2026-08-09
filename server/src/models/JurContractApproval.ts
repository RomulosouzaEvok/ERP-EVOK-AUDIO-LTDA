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
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const JurContractApproval = sequelize.define<any, JurContractApprovalAttributes>('JurContractApproval', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  contract_id: { type: DataTypes.INTEGER, allowNull: false },
  approver_user_id: { type: DataTypes.INTEGER, allowNull: false },
  approver_role: { type: DataTypes.ENUM('diretor', 'financeiro'), allowNull: false },
  approved_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: 'jur_contract_approvals',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['contract_id'] },
    { unique: true, fields: ['contract_id', 'approver_role'], name: 'uq_jur_contract_approvals_contract_role' },
  ],
});

export = JurContractApproval;
