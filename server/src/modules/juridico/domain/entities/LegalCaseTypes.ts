/**
 * DTOs de entrada/saída do cluster Contencioso (JurLegalCase/JurExternalLawyer/
 * JurLegalCaseEvent/JurLegalCaseProvision — UC-53, `docs/business/BLOCO_3_JUR_API.md` §3).
 *
 * @module modules/juridico/domain/entities/LegalCaseTypes
 */

export type CaseType = 'labor' | 'civil' | 'tax' | 'consumer' | 'regulatory' | 'administrative';
export type CaseRole = 'plaintiff' | 'defendant' | 'third_party';
export type CaseStatus = 'active' | 'won' | 'lost' | 'settled' | 'archived';
export type EventType = 'petition' | 'hearing' | 'decision' | 'appeal' | 'deposit' | 'other';
export type RiskClass = 'probable' | 'possible' | 'remote';
export type LegalExpenseType = 'expense' | 'judicial_deposit';

export interface CreateExternalLawyerInput {
  full_name: string;
  oab_number: string;
  law_firm?: string | null;
  document?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  specialty?: string | null;
  fee_terms?: string | null;
  supplier_id?: number | null;
}

export interface UpdateExternalLawyerInput {
  id: number;
  [key: string]: unknown;
}

export interface CreateLegalCaseInput {
  case_number_cnj: string;
  type: CaseType;
  role: CaseRole;
  opposing_party_employee_id?: number | null;
  opposing_party_supplier_id?: number | null;
  opposing_party_client_id?: number | null;
  opposing_party_name?: string | null;
  court?: string | null;
  external_lawyer_id?: number | null;
  claim_value?: string | number | null;
  internal_responsible_user_id: number;
  createdBy: number;
}

export interface CreateLegalCaseEventInput {
  legalCaseId: number;
  event_type: EventType;
  event_date: string;
  description: string;
  attachment_url?: string | null;
  createdBy: number;
}

export interface CreateLegalCaseProvisionInput {
  legalCaseId: number;
  risk_class: RiskClass;
  claim_amount?: string | number | null;
  provisioned_amount?: string | number | null;
  rationale?: string | null;
  assessedBy: number;
  hasApprove: boolean;
}

export interface RegisterCaseCostInput {
  legalCaseId: number;
  entry_type: LegalExpenseType;
  description: string;
  amount: string | number;
  due_date: string;
  category?: string;
}

export interface CloseLegalCaseInput {
  id: number;
  resolution: 'won' | 'lost' | 'settled' | 'archived';
  settlement_amount?: string | number | null;
  installments?: number | null;
  resolution_notes?: string | null;
}
