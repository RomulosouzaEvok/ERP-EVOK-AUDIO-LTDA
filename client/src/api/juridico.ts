import { httpClient } from './httpClient';
import type { ItemResponse, ListResponse } from './types';

/**
 * API do módulo Jurídico (departamento 16, JUR — BLOCO 3). Endpoints
 * hospedados sob `/api/jur/*` (`server/src/modules/juridico/presentation/routes/juridico.ts`),
 * contrato completo em `docs/business/BLOCO_3_JUR_API.md` (71 endpoints
 * documentados, 69 implementados — `corporate-acts`, RF-JUR-030, fica de
 * fora por não ter tabela modelada ainda).
 *
 * SUBSTITUI o módulo Jurídico enxuto (`/api/legal`, `client/src/api/legal.ts`,
 * removido) — a rota antiga não existe mais no backend.
 *
 * CORREÇÃO 2026-08-08 (backend commit `97628ae`): adiciona os 2 clusters que
 * faltavam — Atos Societários (`corporate-acts`, RF-JUR-030, CRUD completo)
 * e alçada de aprovação de contrato por valor (RF-JUR-003,
 * `POST /contracts/:id/approve`). Ver `server/src/modules/juridico/domain/constants.ts`
 * para os thresholds oficiais (espelhados abaixo só para exibição —
 * `requiredApproverRoles` no client NUNCA decide autorização, apenas ajuda a
 * montar a UI; a autorização real é sempre do backend).
 *
 * Nota de tipos importante: como o backend deste bloco NÃO usa um mapper de
 * DTO na resposta (os controllers devolvem a instância Sequelize crua), os
 * campos de RESPOSTA seguem o nome de coluna do banco (`contract_number`,
 * `contract_type`, `case_number`, `case_type`, `case_role`,
 * `signatory_role`, `request_type`, etc.) — diferente dos campos aceitos no
 * BODY de criação/ação, que seguem os nomes do contrato de API (`type`,
 * `role`, `party_type`...) e são traduzidos pelo use case antes de persistir.
 * Os tipos abaixo refletem essa assimetria real (verificada em
 * `server/src/models/Jur*.ts` e nos use-cases), não o exemplo idealizado do
 * documento de contrato.
 *
 * Valores monetários (`value`, `provisioned_amount`, `claim_value`,
 * `amount`) são DECIMAL expostos como `string` no JSON — nunca truncar/
 * arredondar no cliente.
 */

// ---------------------------------------------------------------------------
// Grupo 1 — Contratos
// ---------------------------------------------------------------------------

export type ContractType =
  | 'commercial' | 'employment' | 'supplier' | 'service' | 'rental'
  | 'nda' | 'distribution' | 'commercial_representation' | 'trademark_license' | 'other';
export type CounterpartyType = 'supplier' | 'client' | 'employee' | 'other';
export type AdjustmentIndex = 'ipca' | 'igpm' | 'inpc' | 'other' | 'none';
export type ContractStatus = 'draft' | 'in_approval' | 'approved' | 'signed' | 'active' | 'expired' | 'terminated' | 'canceled';
export type SignatoryRole = 'party_a' | 'party_b' | 'witness';
export type AddendumType = 'term' | 'value' | 'clause' | 'party' | 'other';
export type ChecklistValue = 'yes' | 'no' | 'not_applicable';

export interface ContractSummary {
  id: number;
  contract_number: string;
  contract_type: ContractType;
  object: string;
  counterparty_type: CounterpartyType;
  supplier_id: number | null;
  client_id: number | null;
  employee_id: number | null;
  counterparty_name: string | null;
  value: string | null;
  currency: string;
  start_date: string | null;
  end_date: string | null;
  renewal_auto: boolean;
  notice_days: number | null;
  adjustment_index: AdjustmentIndex;
  status: ContractStatus;
  responsible_user_id: number | null;
  createdAt?: string;
}

export interface ContractDocument {
  id: number;
  contract_id: number;
  version_number: number;
  file_url: string;
  author_id: number;
  uploaded_at: string;
  observations: string | null;
  is_signed_version: boolean;
}

export interface ContractSignatory {
  id: number;
  contract_id: number;
  signatory_role: SignatoryRole;
  name: string;
  document: string | null;
  employee_id: number | null;
  signed_at: string | null;
}

export interface ContractAddendum {
  id: number;
  contract_id: number;
  addendum_number: number;
  addendum_type: AddendumType;
  description: string;
  previous_end_date: string | null;
  new_end_date: string | null;
  previous_value: string | null;
  new_value: string | null;
  document_url: string | null;
  signed_at: string | null;
  createdAt?: string;
}

export interface ContractDetail extends ContractSummary {
  counterparty_doc: string | null;
  adjustment_base_date: string | null;
  alert_advance_days: number;
  clause_checklist: Record<string, ChecklistValue> | null;
  approved_by: number | null;
  approved_at: string | null;
  signed_at: string | null;
  termination_reason: string | null;
  termination_date: string | null;
  created_by: number;
  documents: ContractDocument[];
  signatories: ContractSignatory[];
  addendums: ContractAddendum[];
}

export interface ListContractsParams {
  type?: ContractType;
  status?: ContractStatus;
  supplier_id?: number;
  client_id?: number;
  employee_id?: number;
  responsible_user_id?: number;
  vencendo_em_dias?: number;
  page?: number;
  limit?: number;
}

export async function listContracts(params: ListContractsParams = {}) {
  const { data } = await httpClient.get<ListResponse<ContractSummary>>('/api/jur/contracts', { params });
  return data;
}

export async function getContract(id: number) {
  const { data } = await httpClient.get<ItemResponse<ContractDetail>>(`/api/jur/contracts/${id}`);
  return data.data;
}

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
}

/** `POST /api/jur/contracts` — cria em `draft`. `number` (`contract_number`) é gerado pelo sistema. */
export async function createContract(input: CreateContractInput) {
  const { data } = await httpClient.post<ItemResponse<ContractDetail>>('/api/jur/contracts', input);
  return data.data;
}

/** `PUT /api/jur/contracts/:id` — bloqueado a partir de `signed`, exceto `responsible_user_id`/`alert_advance_days`. */
export async function updateContract(id: number, input: Record<string, unknown>) {
  const { data } = await httpClient.put<ItemResponse<ContractDetail>>(`/api/jur/contracts/${id}`, input);
  return data.data;
}

export async function listContractDocuments(contractId: number) {
  const { data } = await httpClient.get<ItemResponse<ContractDocument[]>>(`/api/jur/contracts/${contractId}/documents`);
  return data.data;
}

export interface AddContractDocumentInput {
  file_url: string;
  notes?: string;
  is_signed_version?: boolean;
}

export async function addContractDocument(contractId: number, input: AddContractDocumentInput) {
  const { data } = await httpClient.post<ItemResponse<ContractDocument>>(`/api/jur/contracts/${contractId}/documents`, input);
  return data.data;
}

export async function listContractSignatories(contractId: number) {
  const { data } = await httpClient.get<ItemResponse<ContractSignatory[]>>(`/api/jur/contracts/${contractId}/signatories`);
  return data.data;
}

export interface AddContractSignatoryInput {
  party_type: SignatoryRole;
  name: string;
  document?: string;
  employee_id?: number | null;
}

export async function addContractSignatory(contractId: number, input: AddContractSignatoryInput) {
  const { data } = await httpClient.post<ItemResponse<ContractSignatory>>(`/api/jur/contracts/${contractId}/signatories`, input);
  return data.data;
}

/** `POST /api/jur/contracts/:id/checklist` — obrigatório para `employment`/`supplier`/`nda` antes da ativação. */
export async function updateContractChecklist(contractId: number, checklist: Record<string, ChecklistValue>) {
  const { data } = await httpClient.post<ItemResponse<ContractDetail>>(`/api/jur/contracts/${contractId}/checklist`, { checklist });
  return data.data;
}

/**
 * `POST /api/jur/contracts/:id/activate`.
 * @throws {AxiosError} 422 BUSINESS_RULE_VIOLATION — sem `responsible_user_id` (E1), sem 2 partes/versão assinada (E3), checklist pendente, ou aprovação(ões) de alçada por valor ainda pendente(s) (RF-JUR-003 — `error.details.missingRoles` lista os papéis faltantes).
 */
export async function activateContract(id: number, responsibleUserId?: number) {
  const { data } = await httpClient.post<ItemResponse<ContractDetail>>(`/api/jur/contracts/${id}/activate`, {
    responsible_user_id: responsibleUserId,
  });
  return data.data;
}

// ---------------------------------------------------------------------------
// Alçada de aprovação de contrato por valor (RF-JUR-003, 2026-08-08)
// ---------------------------------------------------------------------------

export type ContractApproverRole = 'diretor' | 'financeiro';

/** Espelha `server/src/modules/juridico/domain/constants.ts` — só para montar a UI, NUNCA usado para decidir autorização (isso é sempre do backend/RBAC). */
export const JUR_APPROVAL_THRESHOLD_DIRECTOR = 50000;
/** Espelha `server/src/modules/juridico/domain/constants.ts` — só para montar a UI, NUNCA usado para decidir autorização (isso é sempre do backend/RBAC). */
export const JUR_APPROVAL_THRESHOLD_FINANCE = 300000;

/**
 * Resolve (client-side, só para exibição) quais papéis de aprovador o valor
 * do contrato exige, espelhando `requiredApproverRoles` do backend
 * (`server/src/modules/juridico/domain/constants.ts`). Usado para desenhar
 * a seção "Alçada de aprovação" antes de qualquer tentativa de ativação —
 * a situação real (quem já aprovou, o que falta) vem de
 * {@link getContractApprovals}, que é a fonte de verdade.
 */
export function requiredApproverRoles(value: string | number | null | undefined): ContractApproverRole[] {
  const numericValue = value === null || value === undefined || value === '' ? 0 : Number(value);
  if (Number.isNaN(numericValue) || numericValue <= JUR_APPROVAL_THRESHOLD_DIRECTOR) return [];
  if (numericValue <= JUR_APPROVAL_THRESHOLD_FINANCE) return ['diretor'];
  return ['diretor', 'financeiro'];
}

export interface ContractApproval {
  id: number;
  contract_id: number;
  approver_user_id: number;
  approver_role: ContractApproverRole;
  approved_at: string;
}

/** Situação da alçada de um contrato (`GET /api/jur/contracts/:id/approvals`). */
export interface ContractApprovalStatus {
  /** Papéis exigidos pela faixa de valor do contrato (vazio = sem alçada extra). */
  required_roles: ContractApproverRole[];
  /** Aprovações já registradas. */
  approvals: ContractApproval[];
  /** Papéis exigidos que ainda não aprovaram. */
  missing_roles: ContractApproverRole[];
  /** `true` quando a alçada está satisfeita (inclui o caso de não haver alçada). */
  approval_complete: boolean;
}

/**
 * `GET /api/jur/contracts/:id/approvals` — situação da alçada (RF-JUR-003):
 * papéis exigidos, aprovações já registradas e o que falta. Somente leitura,
 * sem efeito colateral. Acessível a `juridico`, `diretor` ou `financeiro`
 * (o aprovador precisa consultar antes de decidir aprovar).
 */
export async function getContractApprovals(id: number) {
  const { data } = await httpClient.get<ItemResponse<ContractApprovalStatus>>(`/api/jur/contracts/${id}/approvals`);
  return data.data;
}

/**
 * `POST /api/jur/contracts/:id/approve` — registra 1 aprovação de alçada
 * (RF-JUR-003). Protegida por `authorizeAnyModule([diretor, financeiro])` —
 * quem chama precisa ter pelo menos um dos 2 módulos de acesso; `role` só
 * desambigua quando o usuário logado tem os dois papéis simultaneamente
 * (a autorização real vem do RBAC no backend, nunca do body).
 * @throws {AxiosError} 400 VALIDATION_ERROR — usuário tem os 2 papéis e não informou `role`.
 * @throws {AxiosError} 422 BUSINESS_RULE_VIOLATION — papel sem permissão, contrato não exige aprovação deste papel para o valor atual, ou papel já aprovou este contrato.
 */
export async function approveContract(id: number, role?: ContractApproverRole) {
  const { data } = await httpClient.post<ItemResponse<ContractApproval>>(`/api/jur/contracts/${id}/approve`, { role });
  return data.data;
}

export async function listContractAddendums(contractId: number) {
  const { data } = await httpClient.get<ItemResponse<ContractAddendum[]>>(`/api/jur/contracts/${contractId}/addendums`);
  return data.data;
}

export interface CreateContractAddendumInput {
  change_type: AddendumType;
  new_end_date?: string | null;
  new_value?: string | number | null;
  description: string;
  document_url?: string;
}

export async function addContractAddendum(contractId: number, input: CreateContractAddendumInput) {
  const { data } = await httpClient.post<ItemResponse<ContractAddendum>>(`/api/jur/contracts/${contractId}/addendums`, input);
  return data.data;
}

export interface TerminateContractInput {
  resolution: 'terminated' | 'expired';
  termination_reason?: string;
  termination_date?: string;
}

/** `POST /api/jur/contracts/:id/terminate` — `terminated` exige `termination_reason` (400 se ausente). */
export async function terminateContract(id: number, input: TerminateContractInput) {
  const { data } = await httpClient.post<ItemResponse<ContractDetail>>(`/api/jur/contracts/${id}/terminate`, input);
  return data.data;
}

/** Fichas cruzadas (RF-JUR-045) — leitura, consumida pela ficha de fornecedor/cliente/funcionário. */
export interface ContractCrossReference {
  id: number;
  contract_number: string;
  contract_type: ContractType;
  status: ContractStatus;
  value: string | null;
  start_date: string | null;
  end_date: string | null;
}

export async function listContractsBySupplier(supplierId: number) {
  const { data } = await httpClient.get<ItemResponse<ContractCrossReference[]>>(`/api/jur/contracts/by-supplier/${supplierId}`);
  return data.data;
}

export async function listContractsByClient(clientId: number) {
  const { data } = await httpClient.get<ItemResponse<ContractCrossReference[]>>(`/api/jur/contracts/by-client/${clientId}`);
  return data.data;
}

export async function listContractsByEmployee(employeeId: number) {
  const { data } = await httpClient.get<ItemResponse<ContractCrossReference[]>>(`/api/jur/contracts/by-employee/${employeeId}`);
  return data.data;
}

// ---------------------------------------------------------------------------
// Grupo 2 — Contencioso: Advogado Externo, Processo, Andamento, Provisão, Custos
// ---------------------------------------------------------------------------

export interface ExternalLawyer {
  id: number;
  full_name: string;
  oab_number: string;
  law_firm: string | null;
  document: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  specialty: string | null;
  fee_terms: string | null;
  supplier_id: number | null;
  active: boolean;
}

export interface ListExternalLawyersParams {
  active?: boolean;
  oab?: string;
  page?: number;
  limit?: number;
}

export async function listExternalLawyers(params: ListExternalLawyersParams = {}) {
  const { data } = await httpClient.get<ListResponse<ExternalLawyer>>('/api/jur/external-lawyers', { params });
  return data;
}

export async function getExternalLawyer(id: number) {
  const { data } = await httpClient.get<ItemResponse<ExternalLawyer>>(`/api/jur/external-lawyers/${id}`);
  return data.data;
}

export interface CreateExternalLawyerInput {
  full_name: string;
  oab_number: string;
  law_firm?: string;
  document?: string;
  contact_email?: string;
  contact_phone?: string;
  specialty?: string;
  fee_terms?: string;
  supplier_id?: number | null;
}

export async function createExternalLawyer(input: CreateExternalLawyerInput) {
  const { data } = await httpClient.post<ItemResponse<ExternalLawyer>>('/api/jur/external-lawyers', input);
  return data.data;
}

export async function updateExternalLawyer(id: number, input: Partial<CreateExternalLawyerInput> & { active?: boolean }) {
  const { data } = await httpClient.put<ItemResponse<ExternalLawyer>>(`/api/jur/external-lawyers/${id}`, input);
  return data.data;
}

export type CaseType = 'labor' | 'civil' | 'tax' | 'consumer' | 'regulatory' | 'administrative';
export type CaseRole = 'plaintiff' | 'defendant' | 'third_party';
export type CaseStatus = 'active' | 'won' | 'lost' | 'settled' | 'archived';
export type RiskClass = 'probable' | 'possible' | 'remote';
export type LegalEventType = 'petition' | 'hearing' | 'decision' | 'appeal' | 'deposit' | 'other';
export type LegalCostEntryType = 'expense' | 'judicial_deposit';

export interface LegalCaseSummary {
  id: number;
  case_number: string;
  case_type: CaseType;
  case_role: CaseRole;
  court: string | null;
  external_lawyer_id: number | null;
  claim_value: string | null;
  internal_responsible_user_id: number;
  status: CaseStatus;
  outcome_amount: string | null;
  outcome_installments: number | null;
  closed_at: string | null;
  next_risk_reassessment_due_at: string | null;
  createdAt?: string;
}

export interface LegalCaseEvent {
  id: number;
  legal_case_id: number;
  event_type: LegalEventType;
  occurred_at: string;
  description: string;
  document_url: string | null;
  created_by: number;
  correction_of_event_id?: number | null;
}

export interface LegalCaseProvision {
  id: number;
  legal_case_id: number;
  risk_class: RiskClass;
  claim_amount: string | null;
  provisioned_amount: string;
  rationale: string | null;
  assessed_by: number;
  assessed_at: string;
}

export interface LegalCaseDetail extends LegalCaseSummary {
  opposing_party_name: string;
  opposing_party_employee_id: number | null;
  opposing_party_supplier_id: number | null;
  opposing_party_client_id: number | null;
  externalLawyer?: ExternalLawyer | null;
  events: LegalCaseEvent[];
  provisions: LegalCaseProvision[];
}

export interface ListLegalCasesParams {
  type?: CaseType;
  status?: CaseStatus;
  risk_class?: RiskClass;
  internal_responsible_user_id?: number;
  sem_avaliacao_vigente?: boolean;
  page?: number;
  limit?: number;
}

export async function listLegalCases(params: ListLegalCasesParams = {}) {
  const { data } = await httpClient.get<ListResponse<LegalCaseSummary>>('/api/jur/legal-cases', { params });
  return data;
}

export async function getLegalCase(id: number) {
  const { data } = await httpClient.get<ItemResponse<LegalCaseDetail>>(`/api/jur/legal-cases/${id}`);
  return data.data;
}

export interface CreateLegalCaseInput {
  case_number_cnj: string;
  type: CaseType;
  role: CaseRole | 'autor' | 'reu' | 'réu' | 'terceiro';
  opposing_party_employee_id?: number | null;
  opposing_party_supplier_id?: number | null;
  opposing_party_client_id?: number | null;
  opposing_party_name?: string | null;
  court?: string;
  external_lawyer_id?: number | null;
  claim_value?: string | number | null;
  internal_responsible_user_id: number;
}

/** @throws {AxiosError} 409 CONFLICT — `case_number_cnj` já cadastrado. */
export async function createLegalCase(input: CreateLegalCaseInput) {
  const { data } = await httpClient.post<ItemResponse<LegalCaseDetail>>('/api/jur/legal-cases', input);
  return data.data;
}

export interface CreateLegalCaseEventInput {
  event_type: LegalEventType;
  event_date?: string;
  description: string;
  attachment_url?: string | null;
}

export async function addLegalCaseEvent(legalCaseId: number, input: CreateLegalCaseEventInput) {
  const { data } = await httpClient.post<ItemResponse<LegalCaseEvent>>(`/api/jur/legal-cases/${legalCaseId}/events`, input);
  return data.data;
}

export async function listLegalCaseEvents(legalCaseId: number) {
  const { data } = await httpClient.get<ItemResponse<LegalCaseEvent[]>>(`/api/jur/legal-cases/${legalCaseId}/events`);
  return data.data;
}

export interface CreateLegalCaseProvisionInput {
  risk_class: RiskClass;
  provisioned_amount?: string | number;
  claim_amount?: string | number | null;
  rationale?: string;
}

/**
 * @throws {AxiosError} 422 BUSINESS_RULE_VIOLATION — `probable` sem `provisioned_amount>0`/`rationale`.
 * @throws {AxiosError} 403 FORBIDDEN — nível `operate` tentando `probable` (exige `approve`).
 */
export async function addLegalCaseProvision(legalCaseId: number, input: CreateLegalCaseProvisionInput) {
  const { data } = await httpClient.post<ItemResponse<LegalCaseProvision>>(`/api/jur/legal-cases/${legalCaseId}/provisions`, input);
  return data.data;
}

export async function listLegalCaseProvisions(legalCaseId: number) {
  const { data } = await httpClient.get<ItemResponse<LegalCaseProvision[]>>(`/api/jur/legal-cases/${legalCaseId}/provisions`);
  return data.data;
}

export async function getCurrentLegalCaseProvision(legalCaseId: number) {
  const { data } = await httpClient.get<ItemResponse<LegalCaseProvision | null>>(`/api/jur/legal-cases/${legalCaseId}/provisions/current`);
  return data.data;
}

export interface RegisterLegalCaseCostInput {
  entry_type: LegalCostEntryType;
  description: string;
  amount: string | number;
  due_date: string;
  category?: string;
}

export interface AccountPayableRef {
  id: number;
  description: string;
  amount: string;
  due_date: string;
  status: string;
  legal_case_id: number | null;
  legal_expense_type: LegalCostEntryType | null;
}

export async function registerLegalCaseCost(legalCaseId: number, input: RegisterLegalCaseCostInput) {
  const { data } = await httpClient.post<ItemResponse<AccountPayableRef>>(`/api/jur/legal-cases/${legalCaseId}/costs`, input);
  return data.data;
}

export interface CloseLegalCaseInput {
  resolution: 'won' | 'lost' | 'settled' | 'archived';
  settlement_amount?: string | number;
  installments?: number;
  resolution_notes?: string;
}

/** `POST /api/jur/legal-cases/:id/close` — nível `approve`. */
export async function closeLegalCase(id: number, input: CloseLegalCaseInput) {
  const { data } = await httpClient.post<ItemResponse<LegalCaseDetail>>(`/api/jur/legal-cases/${id}/close`, input);
  return data.data;
}

export interface ProvisionsReportRow {
  legal_case_id: number;
  case_number: string;
  case_type: string;
  risk_class: string | null;
  provisioned_amount: string | null;
  claim_amount: string | null;
  risco_nao_avaliado: boolean;
}

export interface ProvisionsReport {
  generated_at: string;
  rows: ProvisionsReportRow[];
  totals: { provisioned_total: string; possible_exposure_total: string };
}

/** `GET /api/jur/reports/provisions` — versão completa (módulo `juridico`), inclui `case_number`. */
export async function getProvisionsReport() {
  const { data } = await httpClient.get<ItemResponse<ProvisionsReport>>('/api/jur/reports/provisions');
  return data.data;
}

// ---------------------------------------------------------------------------
// Grupo 3 — Prazos Processuais Fatais (fluxo mais crítico do módulo)
// ---------------------------------------------------------------------------

export type DeadlineStatus = 'pending' | 'fulfilled_pending_confirmation' | 'confirmed' | 'missed' | 'confirmed_late';

export interface DeadlineSummary {
  id: number;
  legal_case_id: number;
  legalCase?: { id: number; case_number: string } | null;
  description: string;
  due_date: string;
  is_fatal: boolean;
  responsible_user_id: number;
  backup_user_id: number | null;
  escalation_user_id: number | null;
  status: DeadlineStatus;
  acknowledged_at: string | null;
  fulfilled_by: number | null;
  fulfilled_at: string | null;
  confirmed_by: number | null;
  confirmed_at: string | null;
  escalated_at: string | null;
  missed_at: string | null;
  retroactive_justification: string | null;
  createdAt?: string;
}

export interface DeadlineDetail extends DeadlineSummary {
  evidence_file_path: string | null;
}

export interface ListDeadlinesParams {
  responsible_user_id?: number;
  status?: DeadlineStatus;
  is_fatal?: boolean;
  vencendo_em_dias?: number;
  legal_case_id?: number;
  page?: number;
  limit?: number;
}

export async function listDeadlines(params: ListDeadlinesParams = {}) {
  const { data } = await httpClient.get<ListResponse<DeadlineSummary>>('/api/jur/legal-case-deadlines', { params });
  return data;
}

/** `GET /api/jur/legal-case-deadlines/critical` — `escalated`/`missed` + `pending` vencendo em ≤3 dias. */
export async function listCriticalDeadlines() {
  const { data } = await httpClient.get<ItemResponse<DeadlineDetail[]>>('/api/jur/legal-case-deadlines/critical');
  return data.data;
}

export async function getDeadline(id: number) {
  const { data } = await httpClient.get<ItemResponse<DeadlineDetail>>(`/api/jur/legal-case-deadlines/${id}`);
  return data.data;
}

export interface CreateDeadlineInput {
  description: string;
  due_date: string;
  is_fatal?: boolean;
  responsible_user_id: number;
  backup_user_id?: number | null;
  escalation_user_id?: number | null;
}

/**
 * `POST /api/jur/legal-cases/:caseId/deadlines`.
 * @throws {AxiosError} 422 BUSINESS_RULE_VIOLATION — sem `responsible_user_id` (BR-JUR-010), ou fatal sem `escalation_user_id` (BR-JUR-011).
 */
export async function createDeadline(legalCaseId: number, input: CreateDeadlineInput) {
  const { data } = await httpClient.post<ItemResponse<DeadlineDetail & { alerts_scheduled: string[] }>>(
    `/api/jur/legal-cases/${legalCaseId}/deadlines`,
    input,
  );
  return data.data;
}

/** `POST /api/jur/legal-case-deadlines/:id/acknowledge` — só o próprio responsável (ou backup com `as_backup: true`). */
export async function acknowledgeDeadline(id: number, asBackup = false) {
  const { data } = await httpClient.post<ItemResponse<DeadlineDetail>>(`/api/jur/legal-case-deadlines/${id}/acknowledge`, {
    as_backup: asBackup,
  });
  return data.data;
}

export interface FulfillDeadlineInput {
  evidence_file_path: string;
  retroactive_justification?: string | null;
}

/**
 * 1ª confirmação (RF-JUR-024).
 * @throws {AxiosError} 400 VALIDATION_ERROR — `evidence_file_path` ausente.
 * @throws {AxiosError} 409 CONFLICT — prazo já cumprido/confirmado.
 * @throws {AxiosError} 422 BUSINESS_RULE_VIOLATION — `missed` sem `retroactive_justification` (BR-JUR-014).
 */
export async function fulfillDeadline(id: number, input: FulfillDeadlineInput) {
  const { data } = await httpClient.post<ItemResponse<DeadlineDetail>>(`/api/jur/legal-case-deadlines/${id}/fulfill`, input);
  return data.data;
}

/**
 * 2ª confirmação — usuário distinto de quem fez `fulfill` (RF-JUR-024).
 * @throws {AxiosError} 422 BUSINESS_RULE_VIOLATION (`SAME_USER_DOUBLE_CONFIRMATION`) — mesmo usuário do `fulfill` (BR-JUR-013).
 */
export async function confirmDeadline(id: number) {
  const { data } = await httpClient.post<ItemResponse<DeadlineDetail>>(`/api/jur/legal-case-deadlines/${id}/confirm`);
  return data.data;
}

// ---------------------------------------------------------------------------
// Grupo 4 — Procurações
// ---------------------------------------------------------------------------

export type ProxyForm = 'public' | 'private';
export type ProxyStatus = 'active' | 'revoked' | 'expired';
export type PowerTag = 'ad_judicia' | 'ad_negotia' | 'banking' | 'other';

export interface Proxy {
  id: number;
  grantor_name: string;
  grantee_name: string;
  grantee_document: string | null;
  employee_id: number | null;
  external_lawyer_id: number | null;
  powers_description: string;
  power_tags: string | null;
  proxy_form: ProxyForm;
  issue_date: string;
  expiration_date: string | null;
  alert_advance_days: number;
  status: ProxyStatus;
  revoked_at: string | null;
  revocation_communication: string | null;
  createdAt?: string;
}

export interface ListProxiesParams {
  status?: ProxyStatus;
  employee_id?: number;
  external_lawyer_id?: number;
  vencendo_em_dias?: number;
  page?: number;
  limit?: number;
}

export async function listProxies(params: ListProxiesParams = {}) {
  const { data } = await httpClient.get<ListResponse<Proxy>>('/api/jur/proxies', { params });
  return data;
}

export async function getProxy(id: number) {
  const { data } = await httpClient.get<ItemResponse<Proxy>>(`/api/jur/proxies/${id}`);
  return data.data;
}

export interface CreateProxyInput {
  grantor?: string;
  grantee_name: string;
  grantee_employee_id?: number | null;
  grantee_external_lawyer_id?: number | null;
  powers_text: string;
  powers_tags?: PowerTag[];
  form: ProxyForm;
  issue_date: string;
  expiration_date?: string | null;
  alert_advance_days?: number;
}

export async function createProxy(input: CreateProxyInput) {
  const { data } = await httpClient.post<ItemResponse<Proxy>>('/api/jur/proxies', input);
  return data.data;
}

/** `POST /api/jur/proxies/:id/revoke` — nível `approve`. `communication_record` obrigatório (400 se ausente). */
export async function revokeProxy(id: number, input: { revocation_date?: string; communication_record: string }) {
  const { data } = await httpClient.post<ItemResponse<Proxy>>(`/api/jur/proxies/${id}/revoke`, input);
  return data.data;
}

// ---------------------------------------------------------------------------
// Grupo 5 — Propriedade Intelectual
// ---------------------------------------------------------------------------

export type IpType = 'trademark' | 'patent' | 'utility_model' | 'industrial_design' | 'copyright' | 'trade_secret';
export type IpStatus = 'filed' | 'granted' | 'active' | 'expired' | 'abandoned';

export interface IpAsset {
  id: number;
  ip_type: IpType;
  registration_number: string | null;
  title: string;
  description: string | null;
  holding_area: string | null;
  filing_date: string | null;
  grant_date: string | null;
  expiration_date: string | null;
  next_annuity_date: string | null;
  status: IpStatus;
  responsible_user_id: number;
  createdAt?: string;
}

export interface IpContractLink {
  id: number;
  ip_id: number;
  contract_id: number;
  link_description: string | null;
  contract?: { id: number; contract_number: string; contract_type?: ContractType; status?: ContractStatus } | null;
}

export interface IpAssetDetail extends IpAsset {
  contractLinks?: IpContractLink[];
}

export interface ListIpAssetsParams {
  type?: IpType;
  status?: IpStatus;
  responsible_user_id?: number;
  vencendo_em_dias?: number;
  page?: number;
  limit?: number;
}

/** `trade_secret` nunca aparece nesta listagem para quem não é `role==='admin'` (§6.3). */
export async function listIpAssets(params: ListIpAssetsParams = {}) {
  const { data } = await httpClient.get<ListResponse<IpAsset>>('/api/jur/ip-assets', { params });
  return data;
}

/** @throws {AxiosError} 403 FORBIDDEN — `type=trade_secret` e `role!=='admin'` (§6.3, RF-JUR-033). */
export async function getIpAsset(id: number) {
  const { data } = await httpClient.get<ItemResponse<IpAssetDetail>>(`/api/jur/ip-assets/${id}`);
  return data.data;
}

export interface CreateIpAssetInput {
  type: IpType;
  registration_number?: string;
  title?: string;
  description?: string;
  holding_area?: string;
  filing_date?: string;
  grant_date?: string;
  expiration_date?: string;
  next_annuity_date?: string;
  status?: IpStatus;
  responsible_user_id: number;
}

/** @throws {AxiosError} 422 BUSINESS_RULE_VIOLATION — `attachment_url` informado com `type=trade_secret` (RF-JUR-033). */
export async function createIpAsset(input: CreateIpAssetInput) {
  const { data } = await httpClient.post<ItemResponse<IpAsset>>('/api/jur/ip-assets', input);
  return data.data;
}

export async function updateIpAsset(id: number, input: Partial<CreateIpAssetInput>) {
  const { data } = await httpClient.put<ItemResponse<IpAsset>>(`/api/jur/ip-assets/${id}`, input);
  return data.data;
}

export async function linkIpAssetContract(ipId: number, contractId: number, linkDescription?: string) {
  const { data } = await httpClient.post<ItemResponse<IpContractLink>>(`/api/jur/ip-assets/${ipId}/contracts`, {
    contract_id: contractId,
    link_description: linkDescription,
  });
  return data.data;
}

export async function listIpAssetContractLinks(ipId: number) {
  const { data } = await httpClient.get<ItemResponse<IpContractLink[]>>(`/api/jur/ip-assets/${ipId}/contracts`);
  return data.data;
}

// ---------------------------------------------------------------------------
// Grupo 6 — LGPD: RoPA, Solicitação de Titular, Incidente
// ---------------------------------------------------------------------------

export type LegalBasis =
  | 'consent' | 'legal_obligation' | 'public_administration' | 'research'
  | 'contract_execution' | 'judicial_process' | 'life_protection'
  | 'health_protection' | 'legitimate_interest' | 'credit_protection';

export interface LgpdProcessingActivity {
  id: number;
  purpose: string;
  legal_basis: LegalBasis;
  data_categories: string;
  data_subject_categories: string;
  source_system: string | null;
  sharing_description: string | null;
  retention_period: string | null;
  security_measures: string | null;
  department_id: number;
  last_reviewed_at: string | null;
  next_review_due_at: string | null;
  createdAt?: string;
}

export interface ListProcessingActivitiesParams {
  department_id?: number;
  legal_basis?: LegalBasis;
  revisao_pendente?: boolean;
  page?: number;
  limit?: number;
}

export async function listProcessingActivities(params: ListProcessingActivitiesParams = {}) {
  const { data } = await httpClient.get<ListResponse<LgpdProcessingActivity>>('/api/jur/lgpd/processing-activities', { params });
  return data;
}

export async function getProcessingActivity(id: number) {
  const { data } = await httpClient.get<ItemResponse<LgpdProcessingActivity>>(`/api/jur/lgpd/processing-activities/${id}`);
  return data.data;
}

export interface CreateProcessingActivityInput {
  purpose: string;
  legal_basis: LegalBasis;
  data_categories: string[] | string;
  data_subject_categories: string[] | string;
  source_system?: string;
  sharing?: string[] | string;
  retention_period?: string;
  security_measures?: string;
  department_id: number;
}

export async function createProcessingActivity(input: CreateProcessingActivityInput) {
  const { data } = await httpClient.post<ItemResponse<LgpdProcessingActivity>>('/api/jur/lgpd/processing-activities', input);
  return data.data;
}

export async function updateProcessingActivity(id: number, input: Partial<CreateProcessingActivityInput>) {
  const { data } = await httpClient.put<ItemResponse<LgpdProcessingActivity>>(`/api/jur/lgpd/processing-activities/${id}`, input);
  return data.data;
}

export async function reviewProcessingActivity(id: number, reviewedAt?: string) {
  const { data } = await httpClient.post<ItemResponse<LgpdProcessingActivity>>(`/api/jur/lgpd/processing-activities/${id}/review`, {
    reviewed_at: reviewedAt,
  });
  return data.data;
}

export type DataSubjectRequestType =
  | 'confirmation' | 'access' | 'correction' | 'anonymization' | 'deletion' | 'portability' | 'consent_revocation' | 'info_sharing';
export type DataSubjectRequestStatus = 'received' | 'verifying' | 'in_progress' | 'answered' | 'rejected_justified';

export interface DataSubjectRequestSummary {
  id: number;
  request_type: DataSubjectRequestType;
  data_subject_category: string | null;
  received_at: string;
  due_date: string;
  status: DataSubjectRequestStatus;
  identity_verified: boolean;
  identity_verified_by: number | null;
  identity_verified_at: string | null;
  resolution_notes: string | null;
  answered_at: string | null;
  dpo_user_id: number;
  createdAt?: string;
}

export interface DataSubjectRequestDetail extends DataSubjectRequestSummary {
  requester_name: string;
  requester_document: string | null;
  requester_email: string | null;
  rejection_justification: string | null;
}

export interface ListDataSubjectRequestsParams {
  type?: DataSubjectRequestType;
  status?: DataSubjectRequestStatus;
  vencido?: boolean;
  page?: number;
  limit?: number;
}

export async function listDataSubjectRequests(params: ListDataSubjectRequestsParams = {}) {
  const { data } = await httpClient.get<ListResponse<DataSubjectRequestSummary>>('/api/jur/lgpd/data-subject-requests', { params });
  return data;
}

/** `GET /api/jur/lgpd/data-subject-requests/pending-critical` — nunca oculta vencidas (E2/RNF-JUR-05). */
export async function listPendingCriticalDataSubjectRequests() {
  const { data } = await httpClient.get<ItemResponse<DataSubjectRequestSummary[]>>('/api/jur/lgpd/data-subject-requests/pending-critical');
  return data.data;
}

export async function getDataSubjectRequest(id: number) {
  const { data } = await httpClient.get<ItemResponse<DataSubjectRequestDetail>>(`/api/jur/lgpd/data-subject-requests/${id}`);
  return data.data;
}

export interface CreateDataSubjectRequestInput {
  type: DataSubjectRequestType;
  requester_name?: string;
  requester_document?: string;
  requester_contact?: string;
  subject_category?: string;
  received_at?: string;
  dpo_user_id?: number;
}

/** `due_date` calculada automaticamente (`received_at + 15 dias`, LGPD art. 19 II). */
export async function createDataSubjectRequest(input: CreateDataSubjectRequestInput) {
  const { data } = await httpClient.post<ItemResponse<DataSubjectRequestDetail>>('/api/jur/lgpd/data-subject-requests', input);
  return data.data;
}

/** @throws {AxiosError} 400 VALIDATION_ERROR — `identity_verified: false` não avança de estado (E1/BR-JUR-041). */
export async function verifyDataSubjectRequestIdentity(id: number, identityVerified: boolean, verificationNotes?: string) {
  const { data } = await httpClient.post<ItemResponse<DataSubjectRequestDetail>>(`/api/jur/lgpd/data-subject-requests/${id}/verify-identity`, {
    identity_verified: identityVerified,
    verification_notes: verificationNotes,
  });
  return data.data;
}

export async function resolveDataSubjectRequest(id: number, resolutionNotes: string, answeredAt?: string) {
  const { data } = await httpClient.post<ItemResponse<DataSubjectRequestDetail>>(`/api/jur/lgpd/data-subject-requests/${id}/resolve`, {
    resolution_notes: resolutionNotes,
    answered_at: answeredAt,
  });
  return data.data;
}

/** `POST /api/jur/lgpd/data-subject-requests/:id/reject` — nível `approve`. `rejection_justification` obrigatório (E3/BR-JUR-041). */
export async function rejectDataSubjectRequest(id: number, rejectionJustification: string) {
  const { data } = await httpClient.post<ItemResponse<DataSubjectRequestDetail>>(`/api/jur/lgpd/data-subject-requests/${id}/reject`, {
    rejection_justification: rejectionJustification,
  });
  return data.data;
}

export type IncidentStatus = 'open' | 'investigating' | 'closed';
export type CommunicationDecision = 'communicate_anpd' | 'communicate_subjects' | 'communicate_both' | 'not_communicate';

export interface IncidentSummary {
  id: number;
  occurred_at: string | null;
  detected_at: string;
  affected_data_subjects_estimate: number | null;
  risk_assessment: string;
  communication_decision: CommunicationDecision | null;
  status: IncidentStatus;
  dpo_user_id: number;
  closed_at: string | null;
  createdAt?: string;
}

export interface IncidentDetail extends IncidentSummary {
  description: string;
  affected_categories: string | null;
  communication_justification: string | null;
  action_plan: string | null;
}

export interface ListIncidentsParams {
  status?: IncidentStatus;
  decisao_comunicacao?: CommunicationDecision;
  page?: number;
  limit?: number;
}

export async function listIncidents(params: ListIncidentsParams = {}) {
  const { data } = await httpClient.get<ListResponse<IncidentSummary>>('/api/jur/lgpd/incidents', { params });
  return data;
}

export async function getIncident(id: number) {
  const { data } = await httpClient.get<ItemResponse<IncidentDetail>>(`/api/jur/lgpd/incidents/${id}`);
  return data.data;
}

export interface CreateIncidentInput {
  occurred_at?: string | null;
  detected_at: string;
  description: string;
  data_categories_affected?: string[] | string;
  subject_categories_affected?: string[] | string;
  risk_assessment: string;
  action_plan?: string;
  dpo_user_id?: number;
}

export async function createIncident(input: CreateIncidentInput) {
  const { data } = await httpClient.post<ItemResponse<IncidentDetail>>('/api/jur/lgpd/incidents', input);
  return data.data;
}

export interface DecideIncidentInput {
  notify_anpd: boolean;
  notify_anpd_justification: string;
  notify_data_subjects: boolean;
  notify_data_subjects_justification: string;
}

/**
 * `POST /api/jur/lgpd/incidents/:id/decision` — nível `approve`. Ambas as
 * justificativas são obrigatórias, mesmo quando a decisão é "não comunicar"
 * (BR-JUR-042).
 */
export async function decideIncident(id: number, input: DecideIncidentInput) {
  const { data } = await httpClient.post<ItemResponse<IncidentDetail>>(`/api/jur/lgpd/incidents/${id}/decision`, input);
  return data.data;
}

/** `POST /api/jur/lgpd/incidents/:id/close` — nível `approve`. Bloqueado sem decisão registrada (E4/BR-JUR-042). */
export async function closeIncident(id: number) {
  const { data } = await httpClient.post<ItemResponse<IncidentDetail>>(`/api/jur/lgpd/incidents/${id}/close`);
  return data.data;
}

// ---------------------------------------------------------------------------
// Grupo 7 — Transversal: Alertas, Relatório Financeiro Sanitizado
// ---------------------------------------------------------------------------

export type AlertOriginType = 'contract' | 'proxy' | 'intellectual_property' | 'lgpd_request' | 'legal_case_deadline';
export type AlertStatus = 'pending' | 'acknowledged' | 'escalated' | 'resolved';

export interface LegalAlert {
  id: number;
  origin_type: AlertOriginType;
  origin_id: number;
  alert_subtype: string;
  due_date: string;
  recipient_user_id: number;
  status: AlertStatus;
  acknowledged_at: string | null;
  escalated_to_user_id: number | null;
  escalated_at: string | null;
  resolved_at: string | null;
  createdAt?: string;
}

export interface ListAlertsParams {
  origin_type?: AlertOriginType;
  status?: AlertStatus;
  responsible_user_id?: number;
  page?: number;
  limit?: number;
}

export async function listAlerts(params: ListAlertsParams = {}) {
  const { data } = await httpClient.get<ListResponse<LegalAlert>>('/api/jur/alerts', { params });
  return data;
}

export async function getAlert(id: number) {
  const { data } = await httpClient.get<ItemResponse<LegalAlert>>(`/api/jur/alerts/${id}`);
  return data.data;
}

/**
 * `POST /api/jur/alerts/:id/acknowledge` — marca como lido/tratado. NUNCA
 * desativa um alerta de prazo fatal (`is_fatal=true`) — não existe rota para
 * isso em todo o módulo (RNF-JUR-04, §4.5).
 */
export async function acknowledgeAlert(id: number) {
  const { data } = await httpClient.post<ItemResponse<LegalAlert>>(`/api/jur/alerts/${id}/acknowledge`);
  return data.data;
}

export interface FinancialReportRow {
  legal_case_reference: string;
  case_type: string;
  risk_class: string;
  provisioned_amount: string;
  cost_center_id: number | null;
}

export interface FinancialReportCost {
  legal_case_reference: string | null;
  entry_type: LegalCostEntryType;
  amount: string;
  due_date: string;
  status: string;
  cost_center_id: number | null;
}

export interface FinancialReport {
  generated_at: string;
  provisions: FinancialReportRow[];
  costs: FinancialReportCost[];
  totals: { provisioned_total: string; possible_exposure_total: string; costs_total_pending: string };
}

/**
 * `GET /api/jur/reports/financeiro` — exceção de campo do perfil
 * `financeiro` (aceita módulo `financeiro:operate` OU `juridico:operate`).
 * Nunca inclui `case_number_cnj`, parte contrária, andamentos, `rationale`
 * ou dado de LGPD/procuração/PI (§8.2).
 */
export async function getFinancialReport() {
  const { data } = await httpClient.get<ItemResponse<FinancialReport>>('/api/jur/reports/financeiro');
  return data.data;
}

// ---------------------------------------------------------------------------
// Atos Societários (RF-JUR-030, 2026-08-08)
// ---------------------------------------------------------------------------

export type CorporateActType = 'general_assembly' | 'partners_meeting' | 'bylaw_amendment' | 'board_resolution' | 'other';
export type CorporateActStatus = 'draft' | 'registered';

export interface CorporateAct {
  id: number;
  act_type: CorporateActType;
  title: string;
  description: string | null;
  act_date: string;
  registration_protocol: string | null;
  registered_at: string | null;
  status: CorporateActStatus;
  document_file_path: string | null;
  created_by: number;
  createdAt?: string;
}

export interface ListCorporateActsParams {
  act_type?: CorporateActType;
  status?: CorporateActStatus;
  page?: number;
  limit?: number;
}

export async function listCorporateActs(params: ListCorporateActsParams = {}) {
  const { data } = await httpClient.get<ListResponse<CorporateAct>>('/api/jur/corporate-acts', { params });
  return data;
}

export async function getCorporateAct(id: number) {
  const { data } = await httpClient.get<ItemResponse<CorporateAct>>(`/api/jur/corporate-acts/${id}`);
  return data.data;
}

export interface CreateCorporateActInput {
  act_type: CorporateActType;
  title: string;
  description?: string | null;
  act_date: string;
  registration_protocol?: string | null;
  registered_at?: string | null;
  document_file_path?: string | null;
}

/** `POST /api/jur/corporate-acts` — sempre cria em `status='draft'` (mesmo que `registration_protocol`/`registered_at` sejam enviados) — a transição para `registered` só acontece via `updateCorporateAct`. */
export async function createCorporateAct(input: CreateCorporateActInput) {
  const { data } = await httpClient.post<ItemResponse<CorporateAct>>('/api/jur/corporate-acts', input);
  return data.data;
}

export interface UpdateCorporateActInput {
  act_type?: CorporateActType;
  title?: string;
  description?: string | null;
  act_date?: string;
  registration_protocol?: string | null;
  registered_at?: string | null;
  document_file_path?: string | null;
}

/**
 * `PUT /api/jur/corporate-acts/:id` — bloqueado depois que `status` vira
 * `registered` (imutabilidade de ato registrado). A transição
 * `draft -> registered` ocorre quando `registration_protocol` e
 * `registered_at` são informados juntos nesta chamada.
 * @throws {AxiosError} 422 BUSINESS_RULE_VIOLATION — ato já `registered` (imutável).
 */
export async function updateCorporateAct(id: number, input: UpdateCorporateActInput) {
  const { data } = await httpClient.put<ItemResponse<CorporateAct>>(`/api/jur/corporate-acts/${id}`, input);
  return data.data;
}
