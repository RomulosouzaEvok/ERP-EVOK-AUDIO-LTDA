/**
 * 💻 Model: ItAccessRequest (Solicitação de Acesso — Onboarding/Change/Offboarding)
 *
 * @module models/ItAccessRequest
 *
 * Tabela `it_access_requests` (migration `20260807-000154`, UC-51).
 * `approved_by` é FK genérica para `users.id` — a elegibilidade
 * (`ti:approve` OU gestor do `department_id` via `departments.manager_id` →
 * `employees.user_id`) é resolvida na camada de autorização/use-case
 * (`ApproveAccessRequestUseCase`), não no schema.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type AccessRequestType = 'grant' | 'change' | 'revoke';
type AccessRequestStatus = 'pending' | 'approved' | 'done' | 'rejected' | 'canceled';

interface ItAccessRequestAttributes {
  id: number;
  request_number: string;
  type: AccessRequestType;
  employee_id: number;
  requested_by: number;
  department_id: number;
  requested_profile_id: number | null;
  justification: string | null;
  corporate_email: string | null;
  equipment_needed: unknown | null;
  approved_by: number | null;
  approved_at: Date | null;
  executed_by: number | null;
  executed_at: Date | null;
  execution_notes: string | null;
  status: AccessRequestStatus;
  rejection_reason: string | null;
  checklist: Record<string, boolean> | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const ItAccessRequest = sequelize.define<any, ItAccessRequestAttributes>('ItAccessRequest', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  request_number: { type: DataTypes.STRING(30), allowNull: false, unique: true },
  type: { type: DataTypes.ENUM('grant', 'change', 'revoke'), allowNull: false },
  employee_id: { type: DataTypes.INTEGER, allowNull: false },
  requested_by: { type: DataTypes.INTEGER, allowNull: false },
  department_id: { type: DataTypes.INTEGER, allowNull: false },
  requested_profile_id: { type: DataTypes.INTEGER, allowNull: true },
  justification: DataTypes.TEXT,
  corporate_email: DataTypes.STRING(150),
  equipment_needed: DataTypes.JSONB,
  approved_by: { type: DataTypes.INTEGER, allowNull: true },
  approved_at: DataTypes.DATE,
  executed_by: { type: DataTypes.INTEGER, allowNull: true },
  executed_at: DataTypes.DATE,
  execution_notes: DataTypes.TEXT,
  status: { type: DataTypes.ENUM('pending', 'approved', 'done', 'rejected', 'canceled'), allowNull: false, defaultValue: 'pending' },
  rejection_reason: DataTypes.TEXT,
  checklist: DataTypes.JSONB,
}, {
  tableName: 'it_access_requests',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['employee_id'] },
    { fields: ['status'] },
    { fields: ['type'] },
    { fields: ['department_id'] },
  ],
});

export = ItAccessRequest;
