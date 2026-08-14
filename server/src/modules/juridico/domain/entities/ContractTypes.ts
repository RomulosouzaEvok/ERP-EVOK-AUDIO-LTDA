/**
 * DTOs de entrada/saída do cluster Contrato (JurContract/JurContractDocument/
 * JurContractSignatory/JurContractAddendum — UC-52, `docs/business/BLOCO_3_JUR_API.md` §2).
 *
 * Extraído em arquivo próprio (somente `export interface`/`export type`)
 * para evitar a armadilha ESM+CJS no mesmo arquivo — mesma convenção de
 * `TicketTypes.ts`/`ProductionDowntimeTypes.ts`.
 *
 * @module modules/juridico/domain/entities/ContractTypes
 */

export type ContractType =
  | 'commercial' | 'employment' | 'supplier' | 'service' | 'rental'
  | 'nda' | 'distribution' | 'commercial_representation' | 'trademark_license' | 'other';

export type CounterpartyType = 'supplier' | 'client' | 'employee' | 'other';
export type AdjustmentIndex = 'ipca' | 'igpm' | 'inpc' | 'other' | 'none';
export type ContractStatus = 'draft' | 'in_approval' | 'approved' | 'signed' | 'active' | 'expired' | 'terminated' | 'canceled';
export type SignatoryRole = 'party_a' | 'party_b' | 'witness';
export type AddendumType = 'term' | 'value' | 'clause' | 'party' | 'other';

export interface CreateContractInput {
  type: ContractType;
  object: string;
  counterparty_type: CounterpartyType;
  supplier_id?: number | null;
  client_id?: number | null;
  employee_id?: number | null;
  counterparty_name?: string | null;
  counterparty_doc?: string | null;
  value?: string | number | null;
  currency?: string;
  start_date?: string | null;
  end_date?: string | null;
  renewal_auto?: boolean;
  notice_days?: number | null;
  adjustment_index?: AdjustmentIndex;
  adjustment_base_date?: string | null;
  alert_advance_days?: number;
  createdBy: number;
}

export interface UpdateContractInput {
  id: number;
  [key: string]: unknown;
}

export interface AddContractDocumentInput {
  contractId: number;
  file_url: string;
  notes?: string | null;
  is_signed_version?: boolean;
  authorId: number;
}

export interface AddContractSignatoryInput {
  contractId: number;
  party_type: SignatoryRole;
  name: string;
  document?: string | null;
  employee_id?: number | null;
}

export interface UpdateContractChecklistInput {
  contractId: number;
  checklist: Record<string, 'yes' | 'no' | 'not_applicable'>;
}

export interface ActivateContractInput {
  id: number;
  responsible_user_id?: number | null;
  approverHasApprove: boolean;
}

export interface CreateContractAddendumInput {
  contractId: number;
  change_type: AddendumType;
  new_end_date?: string | null;
  new_value?: string | number | null;
  description: string;
  document_url?: string | null;
  createdBy: number;
  /**
   * `true` quando quem registra o aditivo tem nivel `approve` no modulo
   * juridico (resolvido no controller a partir do RBAC server-side, NUNCA do
   * body). Exigido para EFETIVAR elevacao de valor — FIND-ERP-005 Falha 3,
   * decisao `APR-2026-021` Parte B 4.
   */
  requesterHasApprove?: boolean;
}

export interface TerminateContractInput {
  id: number;
  resolution: 'terminated' | 'expired';
  termination_reason?: string | null;
  termination_date?: string | null;
}
