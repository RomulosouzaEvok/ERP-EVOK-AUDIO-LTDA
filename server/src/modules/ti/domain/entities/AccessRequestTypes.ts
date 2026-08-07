/**
 * DTOs de entrada do recurso ItAccessRequest (UC-51, onboarding/change/offboarding).
 *
 * @module modules/ti/domain/entities/AccessRequestTypes
 */

export type AccessRequestType = 'grant' | 'change' | 'revoke';

export interface CreateAccessRequestInput {
  type: AccessRequestType;
  employee_id: number;
  department_id?: number;
  requested_profile_id?: number;
  justification?: string;
  corporate_email?: string;
  equipment_needed?: unknown;
  checklist?: Record<string, boolean>;
  requestedBy: number;
}

export interface ApproveAccessRequestInput {
  id: number;
  approverUserId: number;
  approverRole: string;
  approverHasTiApprove: boolean;
}

export interface RejectAccessRequestInput {
  id: number;
  rejection_reason: string;
  approverUserId: number;
  approverRole: string;
  approverHasTiApprove: boolean;
}

export interface ExecuteAccessRequestInput {
  id: number;
  executedBy: number;
  req: unknown;
}

export interface UpdateChecklistInput {
  id: number;
  field: string;
  value: boolean;
}
