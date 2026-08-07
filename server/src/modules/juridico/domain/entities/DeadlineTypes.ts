/**
 * DTOs de entrada/saída de `JurLegalCaseDeadline` — o fluxo mais crítico do
 * módulo (UC-54, `docs/business/BLOCO_3_JUR_API.md` §4).
 *
 * @module modules/juridico/domain/entities/DeadlineTypes
 */

export type DeadlineStatus = 'pending' | 'fulfilled_pending_confirmation' | 'confirmed' | 'missed' | 'confirmed_late';

export interface CreateDeadlineInput {
  legalCaseId: number;
  description: string;
  due_date: string;
  is_fatal?: boolean;
  responsible_user_id: number;
  backup_user_id?: number | null;
  escalation_user_id?: number | null;
  createdBy: number;
}

export interface AcknowledgeDeadlineInput {
  id: number;
  requestingUserId: number;
  asBackup?: boolean;
}

export interface FulfillDeadlineInput {
  id: number;
  evidence_file_path: string;
  retroactive_justification?: string | null;
  fulfilledBy: number;
}

export interface ConfirmDeadlineInput {
  id: number;
  confirmedBy: number;
}

export interface ListDeadlinesFilters {
  responsible_user_id?: number;
  status?: DeadlineStatus;
  is_fatal?: boolean;
  vencendo_em_dias?: number;
  legal_case_id?: number;
}
