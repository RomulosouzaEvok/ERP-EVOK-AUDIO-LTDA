import { httpClient } from './httpClient';
import type { ItemResponse, ListResponse } from './types';

/**
 * API do módulo TI (Tecnologia da Informação, departamento 13). Endpoints
 * hospedados sob `/api/ti/*` (`server/src/modules/ti/presentation/routes/ti.ts`),
 * contrato completo em `docs/business/BLOCO_2_TI_API.md` (57 endpoints).
 *
 * Dois públicos distintos consomem este arquivo:
 * - Auto-serviço (qualquer usuário autenticado): `createTicket`,
 *   `listMyTickets`, `getTicket`, `listTicketComments`, `addTicketComment`,
 *   `confirmTicket`, `reopenTicket`, `listActiveTicketCategories`.
 * - Gestão (módulo `ti`): todo o restante (fila, termos, licenças, acessos,
 *   backup).
 *
 * Tipos de FK são sempre `number` (INTEGER autoIncrement no banco), nunca
 * `string`/UUID — ver nota de tipos em `BLOCO_2_TI_API.md`.
 */

// ---------------------------------------------------------------------------
// Helpdesk — Categorias
// ---------------------------------------------------------------------------

export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface TicketCategory {
  id: number;
  name: string;
  description: string | null;
  default_priority: TicketPriority;
  active: boolean;
}

export interface ListTicketCategoriesParams {
  active?: boolean;
  page?: number;
  limit?: number;
}

export async function listTicketCategories(params: ListTicketCategoriesParams = {}) {
  const { data } = await httpClient.get<ListResponse<TicketCategory>>('/api/ti/ticket-categories', { params });
  return data;
}

/** `GET /api/ti/ticket-categories/active` — público-autenticado, usado no formulário de abertura de chamado. */
export async function listActiveTicketCategories() {
  const { data } = await httpClient.get<ItemResponse<TicketCategory[]>>('/api/ti/ticket-categories/active');
  return data.data;
}

export interface CreateTicketCategoryInput {
  name: string;
  description?: string | null;
  default_priority?: TicketPriority;
  active?: boolean;
}

export async function createTicketCategory(input: CreateTicketCategoryInput) {
  const { data } = await httpClient.post<ItemResponse<TicketCategory>>('/api/ti/ticket-categories', input);
  return data.data;
}

export async function updateTicketCategory(id: number, input: Partial<CreateTicketCategoryInput>) {
  const { data } = await httpClient.put<ItemResponse<TicketCategory>>(`/api/ti/ticket-categories/${id}`, input);
  return data.data;
}

// ---------------------------------------------------------------------------
// Helpdesk — Chamados (ItTicket)
// ---------------------------------------------------------------------------

export type TicketStatus = 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed' | 'canceled';
export type UrgencyPerceived = 'low' | 'medium' | 'high' | 'urgent';

export interface TicketRef {
  id: number;
  name: string;
}

export interface TicketSummary {
  id: number;
  ticket_number: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  category?: { id: number; name: string };
  requester: TicketRef | null;
  assigned_to: TicketRef | null;
  asset: { id: number; tag: string; name: string } | null;
  sla_response_due_at: string | null;
  sla_resolution_due_at: string | null;
  sla_overdue: boolean;
  system_generated: boolean;
  createdAt: string;
}

export interface TicketComment {
  id: number;
  author: TicketRef | null;
  body: string;
  is_internal: boolean;
  created_at: string;
}

export interface TicketDetail extends TicketSummary {
  description: string;
  solution: string | null;
  impact: number | null;
  urgency: number | null;
  first_response_at: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  waiting_minutes: number | null;
  satisfaction_rating: number | null;
  satisfaction_comment: string | null;
  maintenance_order_id: number | null;
  access_request_id: number | null;
  comments: TicketComment[];
}

export interface ListTicketsParams {
  status?: TicketStatus;
  priority?: TicketPriority;
  category_id?: number;
  assigned_to?: number;
  asset_id?: number;
  sla_overdue?: boolean;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

/** `GET /api/ti/tickets` — fila completa (ti:operate). */
export async function listTickets(params: ListTicketsParams = {}) {
  const { data } = await httpClient.get<ListResponse<TicketSummary>>('/api/ti/tickets', { params });
  return data;
}

/** `GET /api/ti/tickets/mine` — auto-serviço, auto-filtrado por `req.user.id`. */
export async function listMyTickets(params: { status?: TicketStatus; page?: number; limit?: number } = {}) {
  const { data } = await httpClient.get<ListResponse<TicketSummary>>('/api/ti/tickets/mine', { params });
  return data;
}

/** `GET /api/ti/tickets/:id` — self-or-module. */
export async function getTicket(id: number) {
  const { data } = await httpClient.get<ItemResponse<TicketDetail>>(`/api/ti/tickets/${id}`);
  return data.data;
}

export interface CreateTicketInput {
  subject: string;
  description: string;
  category_id: number;
  asset_id?: number | null;
  urgency_perceived?: UrgencyPerceived;
  opened_on_behalf_of?: number | null;
}

/** `POST /api/ti/tickets` — público-autenticado. */
export async function createTicket(input: CreateTicketInput) {
  const { data } = await httpClient.post<ItemResponse<TicketDetail>>('/api/ti/tickets', input);
  return data.data;
}

/** `POST /api/ti/tickets/:id/assign` — analista assume o chamado (ti:operate). */
export async function assignTicket(id: number, body: { category_id?: number; impact?: number; urgency?: number } = {}) {
  const { data } = await httpClient.post<ItemResponse<TicketDetail>>(`/api/ti/tickets/${id}/assign`, body);
  return data.data;
}

/** `PUT /api/ti/tickets/:id/priority` (ti:operate). */
export async function changeTicketPriority(
  id: number,
  input: { priority: TicketPriority; impact?: number; urgency?: number; reason: string },
) {
  const { data } = await httpClient.put<ItemResponse<TicketDetail>>(`/api/ti/tickets/${id}/priority`, input);
  return data.data;
}

/** `POST /api/ti/tickets/:id/wait` (ti:operate). */
export async function waitTicket(id: number) {
  const { data } = await httpClient.post<ItemResponse<TicketDetail>>(`/api/ti/tickets/${id}/wait`);
  return data.data;
}

/** `POST /api/ti/tickets/:id/resume` (ti:operate). */
export async function resumeTicket(id: number) {
  const { data } = await httpClient.post<ItemResponse<TicketDetail>>(`/api/ti/tickets/${id}/resume`);
  return data.data;
}

/** `POST /api/ti/tickets/:id/link-maintenance-order` (ti:operate). */
export async function linkMaintenanceOrder(id: number, priority?: string) {
  const { data } = await httpClient.post<ItemResponse<TicketDetail>>(`/api/ti/tickets/${id}/link-maintenance-order`, { priority });
  return data.data;
}

/** `POST /api/ti/tickets/:id/resolve` (ti:operate). */
export async function resolveTicket(id: number, solution: string) {
  const { data } = await httpClient.post<ItemResponse<TicketDetail>>(`/api/ti/tickets/${id}/resolve`, { solution });
  return data.data;
}

/** `POST /api/ti/tickets/:id/confirm` — self-or-module. */
export async function confirmTicket(id: number, body: { satisfaction_rating?: number; satisfaction_comment?: string } = {}) {
  const { data } = await httpClient.post<ItemResponse<TicketDetail>>(`/api/ti/tickets/${id}/confirm`, body);
  return data.data;
}

/** `POST /api/ti/tickets/:id/reopen` — self-or-module. */
export async function reopenTicket(id: number) {
  const { data } = await httpClient.post<ItemResponse<TicketDetail>>(`/api/ti/tickets/${id}/reopen`);
  return data.data;
}

/** `POST /api/ti/tickets/:id/cancel` (ti:operate). */
export async function cancelTicket(id: number) {
  const { data } = await httpClient.post<ItemResponse<TicketDetail>>(`/api/ti/tickets/${id}/cancel`);
  return data.data;
}

/** `GET /api/ti/tickets/:id/comments` — self-or-module (notas internas filtradas para quem não tem módulo `ti`). */
export async function listTicketComments(id: number) {
  const { data } = await httpClient.get<ItemResponse<TicketComment[]>>(`/api/ti/tickets/${id}/comments`);
  return data.data;
}

/** `POST /api/ti/tickets/:id/comments` — self-or-module (`is_internal: true` só aceito com módulo `ti`). */
export async function addTicketComment(id: number, body: string, isInternal = false) {
  const { data } = await httpClient.post<ItemResponse<TicketComment>>(`/api/ti/tickets/${id}/comments`, {
    body,
    is_internal: isInternal,
  });
  return data.data;
}

// ---------------------------------------------------------------------------
// Termo de Responsabilidade de Equipamento (ItResponsibilityTerm)
// ---------------------------------------------------------------------------

export type TermStatus = 'active' | 'returned' | 'lost';
export type AcceptanceType = 'physical_signature' | 'digital_ack';
export type ConditionOnReturn = 'ok' | 'damaged' | 'incomplete';

export interface ResponsibilityTerm {
  id: number;
  term_number: string;
  asset: { id: number; tag?: string; name?: string };
  employee: { id: number; name?: string };
  delivered_at: string;
  delivered_by: TicketRef | number;
  condition_on_delivery: string;
  accessories: string | null;
  acceptance_type: AcceptanceType;
  signed_document_path: string | null;
  returned_at: string | null;
  received_by: TicketRef | number | null;
  condition_on_return: ConditionOnReturn | null;
  return_notes: string | null;
  lost_justification: string | null;
  related_ticket_id: number | null;
  related_maintenance_order_id: number | null;
  status: TermStatus;
  createdAt: string;
}

export interface ListTermsParams {
  employee_id?: number;
  asset_id?: number;
  status?: TermStatus;
  department_id?: number;
  page?: number;
  limit?: number;
}

export async function listResponsibilityTerms(params: ListTermsParams = {}) {
  const { data } = await httpClient.get<ListResponse<ResponsibilityTerm>>('/api/ti/responsibility-terms', { params });
  return data;
}

export async function getResponsibilityTerm(id: number) {
  const { data } = await httpClient.get<ItemResponse<ResponsibilityTerm>>(`/api/ti/responsibility-terms/${id}`);
  return data.data;
}

export interface CreateResponsibilityTermInput {
  asset_id: number;
  employee_id: number;
  condition_on_delivery: string;
  accessories?: string;
  acceptance_type: AcceptanceType;
  signed_document_path?: string | null;
}

/** @throws {AxiosError} 409 CONFLICT — já existe termo ativo para o asset (BR-TI-010). */
export async function createResponsibilityTerm(input: CreateResponsibilityTermInput) {
  const { data } = await httpClient.post<ItemResponse<ResponsibilityTerm>>('/api/ti/responsibility-terms', input);
  return data.data;
}

export async function returnResponsibilityTerm(id: number, input: { condition_on_return: ConditionOnReturn; return_notes?: string }) {
  const { data } = await httpClient.post<ItemResponse<ResponsibilityTerm>>(`/api/ti/responsibility-terms/${id}/return`, input);
  return data.data;
}

/** ti:approve. */
export async function markResponsibilityTermLost(id: number, justification: string) {
  const { data } = await httpClient.post<ItemResponse<ResponsibilityTerm>>(`/api/ti/responsibility-terms/${id}/lost`, { justification });
  return data.data;
}

export async function getEmployeeTerms(employeeId: number) {
  const { data } = await httpClient.get<ItemResponse<ResponsibilityTerm[]>>(`/api/ti/responsibility-terms/by-employee/${employeeId}`);
  return data.data;
}

export interface PendingOffboardingTerms {
  employee_id: number;
  has_pending_terms: boolean;
  terms: Array<{ id: number; asset: { id: number; tag: string; name: string }; delivered_at: string; status: TermStatus }>;
}

export async function getPendingTermsForOffboarding(employeeId: number) {
  const { data } = await httpClient.get<ItemResponse<PendingOffboardingTerms>>(
    `/api/ti/responsibility-terms/pending-for-offboarding/${employeeId}`,
  );
  return data.data;
}

// ---------------------------------------------------------------------------
// Licenças de Software (visão de Asset + ItSoftwareLicenseDetail)
// ---------------------------------------------------------------------------

export type LicenseType = 'perpetual' | 'subscription' | 'free';
export type BillingCycle = 'monthly' | 'yearly' | 'one_time';
export type LicenseStatusDerivado = 'active' | 'expired' | 'expiring' | 'unknown';

export interface License {
  asset_id: number;
  name: string;
  vendor: string;
  license_type: LicenseType;
  seats: number;
  seats_allocated?: number;
  cost: number | string;
  billing_cycle: BillingCycle;
  license_key_masked: string | null;
  renewal_date: string | null;
  license_expires_at: string | null;
  status_derivado: LicenseStatusDerivado;
}

export interface ListLicensesParams {
  vendor?: string;
  license_type?: LicenseType;
  expiring_in_days?: number;
  status_derivado?: LicenseStatusDerivado;
  page?: number;
  limit?: number;
}

export async function listLicenses(params: ListLicensesParams = {}) {
  const { data } = await httpClient.get<ListResponse<License>>('/api/ti/licenses', { params });
  return data;
}

export async function getLicense(assetId: number) {
  const { data } = await httpClient.get<ItemResponse<License>>(`/api/ti/licenses/${assetId}`);
  return data.data;
}

export interface CreateLicenseInput {
  asset_id: number;
  license_type: LicenseType;
  vendor: string;
  seats: number;
  cost: number;
  billing_cycle: BillingCycle;
  license_key?: string;
  renewal_date?: string;
}

/** @throws {AxiosError} 409 CONFLICT — já existe extensão de licença para esse asset_id. */
export async function createLicense(input: CreateLicenseInput) {
  const { data } = await httpClient.post<ItemResponse<License>>('/api/ti/licenses', input);
  return data.data;
}

export async function updateLicense(assetId: number, input: Partial<CreateLicenseInput>) {
  const { data } = await httpClient.put<ItemResponse<License>>(`/api/ti/licenses/${assetId}`, input);
  return data.data;
}

/** `POST /api/ti/licenses/:assetId/reveal-key` — todo acesso gera log de leitura (RNF-TI-01). */
export async function revealLicenseKey(assetId: number) {
  const { data } = await httpClient.post<ItemResponse<{ license_key: string }>>(`/api/ti/licenses/${assetId}/reveal-key`);
  return data.data.license_key;
}

export interface LicenseSeat {
  id: number;
  employee: TicketRef | { id: number };
  assigned_at: string;
  revoked_at: string | null;
}

export async function listLicenseSeats(assetId: number) {
  const { data } = await httpClient.get<ItemResponse<LicenseSeat[]>>(`/api/ti/licenses/${assetId}/seats`);
  return data.data;
}

/** @throws {AxiosError} 422 BUSINESS_RULE_VIOLATION — assentos ativos já atingiram o contratado. */
export async function allocateLicenseSeat(assetId: number, employeeId: number) {
  const { data } = await httpClient.post<ItemResponse<LicenseSeat>>(`/api/ti/licenses/${assetId}/seats`, { employee_id: employeeId });
  return data.data;
}

export async function revokeLicenseSeat(assetId: number, seatId: number) {
  const { data } = await httpClient.delete<ItemResponse<LicenseSeat>>(`/api/ti/licenses/${assetId}/seats/${seatId}`);
  return data.data;
}

export interface ExpiringLicense {
  asset_id: number;
  name: string;
  license_expires_at: string;
  days_remaining: number;
  alert_window: number;
}

export async function listExpiringLicenses() {
  const { data } = await httpClient.get<ItemResponse<ExpiringLicense[]>>('/api/ti/licenses/expiring');
  return data.data;
}

/** ti:approve — gera Requisição de Compra (nunca compra direta, BR-TI-015). */
export async function requestLicenseRenewal(assetId: number, input: { estimated_cost: number; justification: string }) {
  const { data } = await httpClient.post<ItemResponse<{ purchase_requisition_id: number }>>(
    `/api/ti/licenses/${assetId}/request-renewal`,
    input,
  );
  return data.data;
}

// ---------------------------------------------------------------------------
// Solicitações de Acesso — Onboarding/Change/Offboarding (ItAccessRequest)
// ---------------------------------------------------------------------------

export type AccessRequestType = 'grant' | 'change' | 'revoke';
export type AccessRequestStatus = 'pending' | 'approved' | 'done' | 'rejected' | 'canceled';

export interface AccessRequestChecklist {
  user_deactivated?: boolean;
  email_revoked?: boolean;
  equipment_collected?: boolean;
  files_transferred?: boolean;
  [key: string]: boolean | undefined;
}

export interface AccessRequest {
  id: number;
  request_number: string;
  type: AccessRequestType;
  employee: TicketRef;
  department: TicketRef;
  requested_profile: TicketRef | null;
  justification: string;
  corporate_email: string | null;
  equipment_needed: string[] | null;
  requested_by: TicketRef | number;
  approved_by: TicketRef | number | null;
  approved_at: string | null;
  executed_by: TicketRef | number | null;
  executed_at: string | null;
  execution_notes: string | null;
  status: AccessRequestStatus;
  rejection_reason: string | null;
  checklist: AccessRequestChecklist | null;
  createdAt: string;
}

export interface ListAccessRequestsParams {
  type?: AccessRequestType;
  status?: AccessRequestStatus;
  employee_id?: number;
  department_id?: number;
  pending_over_days?: number;
  page?: number;
  limit?: number;
}

export async function listAccessRequests(params: ListAccessRequestsParams = {}) {
  const { data } = await httpClient.get<ListResponse<AccessRequest>>('/api/ti/access-requests', { params });
  return data;
}

export async function getAccessRequest(id: number) {
  const { data } = await httpClient.get<ItemResponse<AccessRequest>>(`/api/ti/access-requests/${id}`);
  return data.data;
}

export interface CreateAccessRequestInput {
  type: AccessRequestType;
  employee_id: number;
  department_id?: number;
  requested_profile_id?: number;
  justification: string;
  corporate_email?: string;
  equipment_needed?: string[];
  checklist?: AccessRequestChecklist;
}

export async function createAccessRequest(input: CreateAccessRequestInput) {
  const { data } = await httpClient.post<ItemResponse<AccessRequest>>('/api/ti/access-requests', input);
  return data.data;
}

/** ti:approve ou gestor do departamento. */
export async function approveAccessRequest(id: number) {
  const { data } = await httpClient.post<ItemResponse<AccessRequest>>(`/api/ti/access-requests/${id}/approve`);
  return data.data;
}

export async function rejectAccessRequest(id: number, rejectionReason: string) {
  const { data } = await httpClient.post<ItemResponse<AccessRequest>>(`/api/ti/access-requests/${id}/reject`, {
    rejection_reason: rejectionReason,
  });
  return data.data;
}

/**
 * `POST /api/ti/access-requests/:id/execute`.
 * @throws {AxiosError} 422 BUSINESS_RULE_VIOLATION (`details.pending_terms`) — offboarding bloqueado por termo ativo (E1).
 */
export async function executeAccessRequest(id: number) {
  const { data } = await httpClient.post<ItemResponse<AccessRequest>>(`/api/ti/access-requests/${id}/execute`);
  return data.data;
}

export async function updateAccessRequestChecklist(id: number, field: string, value: boolean) {
  const { data } = await httpClient.post<ItemResponse<AccessRequest>>(`/api/ti/access-requests/${id}/checklist`, { field, value });
  return data.data;
}

export async function cancelAccessRequest(id: number) {
  const { data } = await httpClient.post<ItemResponse<AccessRequest>>(`/api/ti/access-requests/${id}/cancel`);
  return data.data;
}

// ---------------------------------------------------------------------------
// Backup e Continuidade (ItBackupLog)
// ---------------------------------------------------------------------------

export type BackupType = 'daily' | 'weekly' | 'monthly' | 'restore_test';
export type BackupTarget = 'database' | 'uploads';

export interface BackupLog {
  id: number;
  executed_at: string;
  backup_type: BackupType;
  target: BackupTarget;
  destination: string;
  size_bytes: number | null;
  success: boolean;
  error_message: string | null;
  generated_ticket_id: number | null;
  verified_by: number | null;
  notes: string | null;
}

export interface ListBackupLogsParams {
  backup_type?: BackupType;
  success?: boolean;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

export async function listBackupLogs(params: ListBackupLogsParams = {}) {
  const { data } = await httpClient.get<ListResponse<BackupLog>>('/api/ti/backup-logs', { params });
  return data;
}

export interface CreateBackupLogInput {
  executed_at: string;
  backup_type: BackupType;
  target: BackupTarget;
  destination: string;
  size_bytes?: number;
  success: boolean;
  error_message?: string | null;
  notes?: string | null;
}

/** Se `success: false`, a API cria automaticamente um `ItTicket` urgent (RF-TI-040). */
export async function createBackupLog(input: CreateBackupLogInput) {
  const { data } = await httpClient.post<ItemResponse<BackupLog & { generated_ticket_id: number | null }>>('/api/ti/backup-logs', input);
  return data.data;
}

export interface BackupHealth {
  last_daily_success_at: string | null;
  hours_since_last_daily: number | null;
  daily_alert: boolean;
  last_restore_test_at: string | null;
  days_since_last_restore_test: number | null;
  restore_test_alert: boolean;
}

export async function getBackupHealth() {
  const { data } = await httpClient.get<ItemResponse<BackupHealth>>('/api/ti/backup-logs/health');
  return data.data;
}
