/**
 * DTOs de entrada do recurso ItResponsibilityTerm (UC-50).
 *
 * @module modules/ti/domain/entities/TermTypes
 */

export type AcceptanceType = 'physical_signature' | 'digital_ack';
export type ConditionOnReturn = 'ok' | 'damaged' | 'incomplete';

export interface CreateResponsibilityTermInput {
  asset_id: number;
  employee_id: number;
  condition_on_delivery?: string;
  accessories?: string;
  acceptance_type: AcceptanceType;
  signed_document_path?: string | null;
  deliveredBy: number;
}

export interface ReturnResponsibilityTermInput {
  id: number;
  condition_on_return: ConditionOnReturn;
  return_notes?: string;
  receivedBy: number;
}

export interface MarkTermLostInput {
  id: number;
  justification: string;
}
