/**
 * DTOs de entrada/saída do cluster LGPD — RoPA (`JurLgpdProcessingActivity`),
 * Solicitação de Titular (`JurLgpdDataSubjectRequest`) e Incidente
 * (`JurLgpdIncident`) — UC-56, `docs/business/BLOCO_3_JUR_API.md` §7.
 *
 * @module modules/juridico/domain/entities/LgpdTypes
 */

export type LegalBasis =
  | 'consent' | 'legal_obligation' | 'public_administration' | 'research'
  | 'contract_execution' | 'judicial_process' | 'life_protection'
  | 'health_protection' | 'legitimate_interest' | 'credit_protection';

export interface CreateProcessingActivityInput {
  purpose: string;
  legal_basis: LegalBasis;
  data_categories: string[] | string;
  data_subject_categories: string[] | string;
  source_system?: string | null;
  sharing?: string[] | string | null;
  retention_period?: string | null;
  security_measures?: string | null;
  department_id: number;
  createdBy: number;
}

export interface UpdateProcessingActivityInput {
  id: number;
  [key: string]: unknown;
}

export interface ReviewProcessingActivityInput {
  id: number;
  reviewedAt?: string | null;
}

export type DataSubjectRequestType =
  | 'confirmation' | 'access' | 'correction' | 'anonymization' | 'deletion'
  | 'portability' | 'consent_revocation' | 'info_sharing';

export interface CreateDataSubjectRequestInput {
  type: DataSubjectRequestType;
  requester_name?: string;
  requester_document?: string | null;
  requester_contact?: string | null;
  requester_email?: string | null;
  subject_category?: string | null;
  received_at?: string | null;
  dpoUserId: number;
}

export interface VerifyIdentityInput {
  id: number;
  identity_verified: boolean;
  verification_notes?: string | null;
  verifiedBy: number;
}

export interface ResolveDataSubjectRequestInput {
  id: number;
  resolution_notes: string;
  answered_at?: string | null;
}

export interface RejectDataSubjectRequestInput {
  id: number;
  rejection_justification: string;
}

export type CommunicationDecision = 'communicate_anpd' | 'communicate_subjects' | 'communicate_both' | 'not_communicate';

export interface CreateIncidentInput {
  occurred_at?: string | null;
  detected_at: string;
  description: string;
  data_categories_affected?: string[] | string | null;
  subject_categories_affected?: string[] | string | null;
  risk_assessment: string;
  action_plan?: string | null;
  createdBy: number;
  dpoUserId?: number | null;
}

export interface DecideIncidentInput {
  id: number;
  notify_anpd: boolean;
  notify_anpd_justification: string;
  notify_data_subjects: boolean;
  notify_data_subjects_justification: string;
}

export interface CloseIncidentInput {
  id: number;
}
