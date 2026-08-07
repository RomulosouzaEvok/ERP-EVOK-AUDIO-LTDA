import { httpClient } from './httpClient';
import type { ItemResponse, ListResponse } from './types';

/**
 * Módulo Marketing (departamento 14, sigla MKT). Endpoints hospedados sob
 * `/api/marketing/*` (`server/src/modules/marketing/presentation/routes/marketing.ts`),
 * BLOCO 5 (correção) — 27 endpoints em 5 grupos: Campanhas, Leads, Evento/
 * Feira, Relatórios/KPIs de funil e Materiais de Divulgação.
 *
 * Breaking changes vs. a primeira entrega (ver `docs/business/BLOCO_5_MKT_API.md`):
 * - `campaign.budget` → `budget_requested`/`budget_approved`/`budget_approval_status`.
 * - `POST /leads/:id/status` não aceita mais `status='converted'` — usar
 *   `POST /leads/:id/convert` (transacional, cliente existente ou novo).
 * - `leads_generated`/`conversions`/`roi` de campanha são sempre derivados
 *   (nunca aceitos em `POST`/`PUT`) — usar `POST /campaigns/:id/recalculate-metrics`.
 * - `POST /materials` não aceita mais `approved` — usar
 *   `PATCH /materials/:id/approve`.
 *
 * Valores monetários (`budget_requested`, `budget_approved`, `actual_cost`,
 * `roi`, etc.) chegam como `string` (DECIMAL), nunca `number` — nunca
 * reconvertidos para número antes de reenviar ao backend (evita perda de
 * precisão). Datas de planejamento são `DATEONLY` (`"YYYY-MM-DD"`); eventos
 * pontuais (`qualified_at`, `handoff_at`, `converted_at`, etc.) são
 * `TIMESTAMP` ISO completo.
 */

// ---------------------------------------------------------------------------
// Campanhas
// ---------------------------------------------------------------------------

export type CampaignType = 'ads' | 'social' | 'email' | 'event' | 'trade' | 'content';
export type CampaignStatus = 'planned' | 'active' | 'paused' | 'completed' | 'canceled';
export type BudgetApprovalStatus = 'pending' | 'approved' | 'rejected';
export type BudgetAlertLevel = 'none' | 'warning_90' | 'over_100';

export interface Campaign {
  id: number;
  name: string;
  description: string | null;
  campaign_type: CampaignType;
  start_date: string;
  end_date: string | null;
  budget_requested: string | null;
  budget_approved: string | null;
  budget_approval_status: BudgetApprovalStatus;
  budget_approved_by: number | null;
  budget_approved_at: string | null;
  actual_cost: string;
  target_audience: string | null;
  channel: string | null;
  leads_generated: number;
  conversions: number;
  roi: string | null;
  metrics_recalculated_at: string | null;
  notes: string | null;
  budget_alert_level: BudgetAlertLevel | null;
  status: CampaignStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface ListCampaignsParams {
  status?: CampaignStatus;
  campaign_type?: CampaignType;
  page?: number;
  limit?: number;
}

export interface CreateCampaignInput {
  name: string;
  description?: string;
  campaign_type: CampaignType;
  start_date: string;
  end_date?: string;
  budget_requested?: number;
  actual_cost?: number;
  target_audience?: string;
  channel?: string;
  status?: CampaignStatus;
}

/** `notes` só é aceito quando a campanha atual está `completed`/`canceled` (única exceção à imutabilidade, RF-MKT-034). */
export type UpdateCampaignInput = Partial<CreateCampaignInput> & { notes?: string | null };

export interface BudgetDecisionInput {
  decision: 'approved' | 'rejected';
  /** Obrigatório quando `decision === 'approved'`. */
  budget_approved?: number;
  reason?: string;
}

export interface RecalculateMetricsResult {
  id: number;
  leads_generated: number;
  conversions: number;
  roi: string | null;
  recalculated_at: string;
}

/** `GET /api/marketing/campaigns` — listagem paginada, expõe `budget_alert_level` calculado (RF-MKT-032). */
export async function listCampaigns(params: ListCampaignsParams = {}) {
  const { data } = await httpClient.get<ListResponse<Campaign>>('/api/marketing/campaigns', { params });
  return data;
}

/** `GET /api/marketing/campaigns/:id` — busca por id. */
export async function getCampaign(id: number) {
  const { data } = await httpClient.get<ItemResponse<Campaign>>(`/api/marketing/campaigns/${id}`);
  return data.data;
}

/** `POST /api/marketing/campaigns` — cria uma campanha (`budget_requested`, sem métricas). */
export async function createCampaign(input: CreateCampaignInput) {
  const { data } = await httpClient.post<ItemResponse<Campaign>>('/api/marketing/campaigns', input);
  return data.data;
}

/** `PUT /api/marketing/campaigns/:id` — atualiza campos (bloqueado pós `completed`/`canceled`, exceto `notes`). */
export async function updateCampaign(id: number, input: UpdateCampaignInput) {
  const { data } = await httpClient.put<ItemResponse<Campaign>>(`/api/marketing/campaigns/${id}`, input);
  return data.data;
}

/** `POST /api/marketing/campaigns/:id/budget-decision` — aprova/rejeita orçamento (nível `approve`, RF-MKT-030/031). */
export async function decideCampaignBudget(id: number, input: BudgetDecisionInput) {
  const { data } = await httpClient.post<ItemResponse<Campaign>>(`/api/marketing/campaigns/${id}/budget-decision`, input);
  return data.data;
}

/** `POST /api/marketing/campaigns/:id/recalculate-metrics` — recálculo idempotente do cache de métricas (RF-MKT-009). */
export async function recalculateCampaignMetrics(id: number) {
  const { data } = await httpClient.post<ItemResponse<RecalculateMetricsResult>>(`/api/marketing/campaigns/${id}/recalculate-metrics`, {});
  return data.data;
}

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------

export type LeadSource = 'website' | 'instagram' | 'facebook' | 'google' | 'email' | 'event' | 'indication' | 'other';
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'in_sales_attendance' | 'converted' | 'lost';
/** Funil aceito por `POST /leads/:id/status` — `converted` nunca é aceito aqui (use `convertLead`). */
export type ChangeableLeadStatus = Exclude<LeadStatus, 'converted'>;
export type ConsentChannel = 'formulario_site' | 'whatsapp' | 'telefone' | 'feira' | 'indicacao' | 'outro';

export interface Lead {
  id: number;
  campaign_id: number | null;
  campaign?: { id: number; name: string } | null;
  event_id: number | null;
  event?: { id: number; name: string } | null;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  interest: string | null;
  lead_source: LeadSource | null;
  lead_score: number;
  status: LeadStatus;
  qualified_at: string | null;
  sales_owner_user_id: number | null;
  handoff_at: string | null;
  first_response_at: string | null;
  converted_to_customer_id: number | null;
  convertedCustomer?: { id: number; name: string } | null;
  converted_at: string | null;
  consent_given: boolean;
  consent_date: string | null;
  consent_channel: ConsentChannel | null;
  /** Lead rebaixado pelo saneamento de dado órfão (`converted` sem cliente vinculado, estado pré-existente inválido) — apenas sinalização, nunca ação. */
  needs_review: boolean;
  createdAt?: string;
}

export interface ListLeadsParams {
  status?: LeadStatus;
  campaign_id?: number;
  event_id?: number;
  lead_source?: LeadSource;
  sales_owner_user_id?: number;
  sla_breached?: boolean;
  data_issue_flag?: boolean;
  page?: number;
  limit?: number;
}

export interface CreateLeadInput {
  campaign_id?: number;
  event_id?: number;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  interest?: string;
  lead_source: LeadSource;
  lead_score?: number;
  consent_given?: boolean;
  consent_date?: string;
  consent_channel?: ConsentChannel;
}

export type UpdateLeadInput = Partial<Omit<CreateLeadInput, 'lead_source'>> & { lead_source?: LeadSource };

export interface BulkCreateLeadItemInput {
  event_id?: number;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  interest?: string;
  lead_source?: LeadSource;
  lead_score?: number;
}

export interface BulkCreateLeadsInput {
  /** Aplicado a todo item que não traga o próprio `event_id` (conveniência de captação pós-feira). */
  event_id?: number;
  leads: BulkCreateLeadItemInput[];
}

export interface BulkCreateLeadsResult {
  created: Array<{ index: number; lead: Lead }>;
  rejected: Array<{ index: number; error: { code: string; message: string } }>;
}

export interface ChangeLeadStatusInput {
  status: ChangeableLeadStatus;
  /** Aceito somente quando `status === 'qualified'` (atribuição simultânea ao handoff). */
  sales_owner_user_id?: number;
}

export interface ConvertLeadInput {
  /** Opção A — vincula cliente já existente. Mutuamente exclusiva com `new_client`. */
  client_id?: number;
  /** Opção B — cria cliente novo na mesma transação. Mutuamente exclusiva com `client_id`. */
  new_client?: {
    name: string;
    cpf_cnpj: string;
    phone?: string;
    email?: string;
    cep?: string;
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
  };
}

export interface ConvertLeadResult {
  lead: Lead;
  client: { id: number; name: string; [key: string]: unknown };
}

/** `GET /api/marketing/leads` — listagem paginada, com filtros de status/campanha/evento/origem/responsável/SLA/`needs_review`. */
export async function listLeads(params: ListLeadsParams = {}) {
  const { data } = await httpClient.get<ListResponse<Lead>>('/api/marketing/leads', { params });
  return data;
}

/** `GET /api/marketing/leads/:id` — busca por id. */
export async function getLead(id: number) {
  const { data } = await httpClient.get<ItemResponse<Lead>>(`/api/marketing/leads/${id}`);
  return data.data;
}

/** `POST /api/marketing/leads` — cria um lead (dedup + validação cruzada de contato/origem, RF-MKT-016/017/018). */
export async function createLead(input: CreateLeadInput) {
  const { data } = await httpClient.post<ItemResponse<Lead>>('/api/marketing/leads', input);
  return data.data;
}

/** `POST /api/marketing/leads/bulk` — captação em lote, processamento parcial item a item (RF-MKT-019). */
export async function bulkCreateLeads(input: BulkCreateLeadsInput) {
  const { data } = await httpClient.post<ItemResponse<BulkCreateLeadsResult>>('/api/marketing/leads/bulk', input);
  return data.data;
}

/** `PUT /api/marketing/leads/:id` — atualiza dados cadastrais (nunca `status`/conversão). */
export async function updateLead(id: number, input: UpdateLeadInput) {
  const { data } = await httpClient.put<ItemResponse<Lead>>(`/api/marketing/leads/${id}`, input);
  return data.data;
}

/** `POST /api/marketing/leads/:id/status` — avança o lead no funil (exceto `converted` — use `convertLead`). */
export async function changeLeadStatus(id: number, input: ChangeLeadStatusInput) {
  const { data } = await httpClient.post<ItemResponse<Lead>>(`/api/marketing/leads/${id}/status`, input);
  return data.data;
}

/** `POST /api/marketing/leads/:id/handoff` — atribui/reatribui responsável de Vendas (RBAC `marketing` OU `vendas`). */
export async function handoffLead(id: number, salesOwnerUserId: number) {
  const { data } = await httpClient.post<ItemResponse<Lead>>(`/api/marketing/leads/${id}/handoff`, { sales_owner_user_id: salesOwnerUserId });
  return data.data;
}

/** `POST /api/marketing/leads/:id/convert` — conversão ATÔMICA lead → cliente (RF-MKT-001/002/003, UC-63). */
export async function convertLead(id: number, input: ConvertLeadInput) {
  const { data } = await httpClient.post<ItemResponse<ConvertLeadResult>>(`/api/marketing/leads/${id}/convert`, input);
  return data.data;
}

// ---------------------------------------------------------------------------
// Evento/Feira
// ---------------------------------------------------------------------------

export type EventType = 'feira' | 'lancamento' | 'workshop' | 'regional';
export type EventStatus = 'planned' | 'in_progress' | 'completed' | 'canceled';
export type ChecklistItemStatus = 'pending' | 'done';

export interface EventChecklistItem {
  id: number;
  event_id: number;
  description: string;
  status: ChecklistItemStatus;
  responsible_user_id: number | null;
  createdAt?: string;
}

export interface MarketingEvent {
  id: number;
  name: string;
  location: string | null;
  event_type: EventType;
  campaign_id: number | null;
  campaign?: { id: number; name: string } | null;
  start_date: string;
  end_date: string | null;
  budget: string | null;
  actual_cost: string | null;
  status: EventStatus;
  createdAt?: string;
}

/** Shape estendido retornado só por `getEvent` (`GET /events/:id`) — inclui `leads_count`/`cost_per_lead` calculados e checklist. */
export interface MarketingEventDetail extends MarketingEvent {
  leads_count: number;
  cost_per_lead: string | null;
  checklist: EventChecklistItem[];
}

export interface ListEventsParams {
  status?: EventStatus;
  event_type?: EventType;
  campaign_id?: number;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

export interface CreateEventInput {
  name: string;
  location?: string;
  event_type: EventType;
  campaign_id?: number;
  start_date: string;
  end_date?: string;
  budget?: number;
}

export interface UpdateEventInput extends Partial<CreateEventInput> {
  actual_cost?: number;
  status?: EventStatus;
}

/** `GET /api/marketing/events` — listagem paginada, filtros de status/tipo/campanha/período. */
export async function listEvents(params: ListEventsParams = {}) {
  const { data } = await httpClient.get<ListResponse<MarketingEvent>>('/api/marketing/events', { params });
  return data;
}

/** `GET /api/marketing/events/:id` — detalhe, com `leads_count`/`cost_per_lead` calculados e checklist. */
export async function getEvent(id: number) {
  const { data } = await httpClient.get<ItemResponse<MarketingEventDetail>>(`/api/marketing/events/${id}`);
  return data.data;
}

/** `POST /api/marketing/events` — cria evento/feira (RF-MKT-020). */
export async function createEvent(input: CreateEventInput) {
  const { data } = await httpClient.post<ItemResponse<MarketingEvent>>('/api/marketing/events', input);
  return data.data;
}

/** `PUT /api/marketing/events/:id` — atualiza (bloqueado quando `completed`/`canceled`, mesma disciplina de campanha). */
export async function updateEvent(id: number, input: UpdateEventInput) {
  const { data } = await httpClient.put<ItemResponse<MarketingEvent>>(`/api/marketing/events/${id}`, input);
  return data.data;
}

/** `POST /api/marketing/events/:id/checklist` — adiciona item de checklist (RF-MKT-021). */
export async function addEventChecklistItem(id: number, input: { description: string; responsible_user_id?: number }) {
  const { data } = await httpClient.post<ItemResponse<EventChecklistItem>>(`/api/marketing/events/${id}/checklist`, input);
  return data.data;
}

/** `PUT /api/marketing/events/:id/checklist/:itemId` — atualiza item (status/responsável). */
export async function updateEventChecklistItem(
  id: number,
  itemId: number,
  input: { description?: string; status?: ChecklistItemStatus; responsible_user_id?: number | null },
) {
  const { data } = await httpClient.put<ItemResponse<EventChecklistItem>>(`/api/marketing/events/${id}/checklist/${itemId}`, input);
  return data.data;
}

/** `POST /api/marketing/events/:id/close` — encerra o evento, exige `actual_cost` (no payload ou já gravado, RF-MKT-025). */
export async function closeEvent(id: number, actualCost?: number) {
  const { data } = await httpClient.post<ItemResponse<MarketingEvent>>(`/api/marketing/events/${id}/close`, { actual_cost: actualCost });
  return data.data;
}

/** `GET /api/marketing/events/:id/leads` — atalho de `listLeads({ event_id: id })`. */
export async function getEventLeads(id: number) {
  const { data } = await httpClient.get<ListResponse<Lead>>(`/api/marketing/events/${id}/leads`);
  return data;
}

// ---------------------------------------------------------------------------
// Relatórios / KPIs de funil
// ---------------------------------------------------------------------------

export interface FunnelReportParams {
  campaign_id?: number;
  lead_source?: LeadSource;
  date_from?: string;
  date_to?: string;
}

export interface FunnelReport {
  period: { from: string | null; to: string | null };
  filters: { campaign_id: number | null; lead_source: string | null };
  cost_per_lead: string | null;
  qualification_rate: string | null;
  conversion_rate: string | null;
  attributed_revenue: string | null;
  roi: string | null;
  handoff_sla_compliance_rate: string | null;
  median_lead_cycle_days: string | null;
  budget_vs_actual: { requested: string; approved: string | null; actual: string } | null;
  /** `false` quando o filtro não retorna nenhum lead/campanha — todos os campos numéricos vêm `null`, nunca erro (UC-66 E1). */
  has_data: boolean;
}

export interface EventsReportParams {
  event_type?: EventType;
  date_from?: string;
  date_to?: string;
}

export interface EventReportRow {
  event_id: number;
  name: string;
  actual_cost: string | null;
  leads_count: number;
  conversions: number;
  attributed_revenue: string;
  cost_per_lead: string | null;
  roi: string | null;
}

/** `GET /api/marketing/reports/funnel` — CPL, taxa de qualificação/conversão, ROI, SLA de handoff, ciclo, orçado×realizado (RF-MKT-026). Sempre `200`, mesmo sem dados. */
export async function getFunnelReport(params: FunnelReportParams = {}) {
  const { data } = await httpClient.get<ItemResponse<FunnelReport>>('/api/marketing/reports/funnel', { params });
  return data.data;
}

/** `GET /api/marketing/reports/events` — ROI/custo por lead agregado por evento (RF-MKT-024/027). */
export async function getEventsReport(params: EventsReportParams = {}) {
  const { data } = await httpClient.get<ItemResponse<EventReportRow[]>>('/api/marketing/reports/events', { params });
  return data.data;
}

// ---------------------------------------------------------------------------
// Materiais de divulgação
// ---------------------------------------------------------------------------

export type MaterialType = 'catalog' | 'flyer' | 'banner' | 'video' | 'manual' | 'technical_sheet' | 'presentation';

export interface Material {
  id: number;
  title: string;
  material_type: MaterialType;
  product_id: string | null;
  product?: { id: string; codigo: string; descricao: string } | null;
  stock_item_id: string | null;
  file_path: string | null;
  version: string;
  approved: boolean;
  approved_by: number | null;
  approved_at: string | null;
  createdAt?: string;
}

export interface ListMaterialsParams {
  material_type?: MaterialType;
  product_id?: string;
  stock_item_id?: string;
  approved?: boolean;
  page?: number;
  limit?: number;
}

export interface CreateMaterialInput {
  title: string;
  material_type: MaterialType;
  /** UUID de `items.id` — material vinculado ao produto retratado (ex. catálogo de um modelo específico). */
  product_id?: string;
  /** UUID de `items.id` do Almoxarifado (categoria "Material Promocional") — material físico, sem movimentação criada por este módulo. */
  stock_item_id?: string;
  version?: string;
}

export type UpdateMaterialInput = Partial<CreateMaterialInput>;

/** `GET /api/marketing/materials` — listagem paginada, filtros de tipo/produto/item de estoque/aprovação. */
export async function listMaterials(params: ListMaterialsParams = {}) {
  const { data } = await httpClient.get<ListResponse<Material>>('/api/marketing/materials', { params });
  return data;
}

/** `GET /api/marketing/materials/:id` — busca por id. */
export async function getMaterial(id: number) {
  const { data } = await httpClient.get<ItemResponse<Material>>(`/api/marketing/materials/${id}`);
  return data.data;
}

/** `POST /api/marketing/materials` — cria os metadados de um material — nasce sempre `approved=false` (RF-MKT-039). */
export async function createMaterial(input: CreateMaterialInput) {
  const { data } = await httpClient.post<ItemResponse<Material>>('/api/marketing/materials', input);
  return data.data;
}

/** `PUT /api/marketing/materials/:id` — atualiza metadados (nunca `approved` — use `approveMaterial`). */
export async function updateMaterial(id: number, input: UpdateMaterialInput) {
  const { data } = await httpClient.put<ItemResponse<Material>>(`/api/marketing/materials/${id}`, input);
  return data.data;
}

/** `POST /api/marketing/materials/:id/file` — envia/substitui o arquivo (nova versão sobre material aprovado reverte `approved=false`, RF-MKT-040). */
export async function uploadMaterialFile(id: number, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  // Content-Type explicitamente indefinido: deixa o navegador computar o
  // boundary do multipart automaticamente (mesmo padrão de `uploadAssetPhoto`).
  const { data } = await httpClient.post<ItemResponse<Material>>(`/api/marketing/materials/${id}/file`, formData, {
    headers: { 'Content-Type': undefined },
  });
  return data.data;
}

/** `PATCH /api/marketing/materials/:id/approve` — aprova o material (nível `approve`, RF-MKT-039). */
export async function approveMaterial(id: number) {
  const { data } = await httpClient.patch<ItemResponse<Material>>(`/api/marketing/materials/${id}/approve`, {});
  return data.data;
}
