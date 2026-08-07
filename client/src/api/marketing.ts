import { httpClient } from './httpClient';
import type { ItemResponse, ListResponse } from './types';

/**
 * Módulo Marketing (departamento 14, sigla MKT). Endpoints hospedados sob
 * `/api/marketing/*` (`server/src/modules/marketing/presentation/routes/marketing.ts`).
 * Cobre 3 entidades: Campanhas, Leads (com funil dedicado) e Materiais de
 * Divulgação (com upload de arquivo) — CRUD create/list/get/update (sem
 * delete, mesma decisão de design do módulo Facilities).
 */

// ---------------------------------------------------------------------------
// Campanhas
// ---------------------------------------------------------------------------

export type CampaignType = 'ads' | 'social' | 'email' | 'event' | 'trade' | 'content';
export type CampaignStatus = 'planned' | 'active' | 'paused' | 'completed' | 'canceled';

export interface Campaign {
  id: number;
  name: string;
  description: string | null;
  campaign_type: CampaignType;
  start_date: string;
  end_date: string | null;
  budget: string | number | null;
  actual_cost: string | number;
  target_audience: string | null;
  channel: string | null;
  leads_generated: number;
  conversions: number;
  roi: string | number | null;
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
  budget?: number;
  actual_cost?: number;
  target_audience?: string;
  channel?: string;
  roi?: number;
  status?: CampaignStatus;
}

export type UpdateCampaignInput = Partial<CreateCampaignInput> & { leads_generated?: number; conversions?: number };

/** `GET /api/marketing/campaigns` — listagem paginada, filtros opcionais por `status`/`campaign_type`. */
export async function listCampaigns(params: ListCampaignsParams = {}) {
  const { data } = await httpClient.get<ListResponse<Campaign>>('/api/marketing/campaigns', { params });
  return data;
}

/** `GET /api/marketing/campaigns/:id` — busca por id. */
export async function getCampaign(id: number) {
  const { data } = await httpClient.get<ItemResponse<Campaign>>(`/api/marketing/campaigns/${id}`);
  return data.data;
}

/** `POST /api/marketing/campaigns` — cria uma campanha. */
export async function createCampaign(input: CreateCampaignInput) {
  const { data } = await httpClient.post<ItemResponse<Campaign>>('/api/marketing/campaigns', input);
  return data.data;
}

/** `PUT /api/marketing/campaigns/:id` — atualiza campos da campanha. */
export async function updateCampaign(id: number, input: UpdateCampaignInput) {
  const { data } = await httpClient.put<ItemResponse<Campaign>>(`/api/marketing/campaigns/${id}`, input);
  return data.data;
}

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------

export type LeadSource = 'website' | 'instagram' | 'facebook' | 'google' | 'email' | 'event' | 'indication' | 'other';
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';

export interface Lead {
  id: number;
  campaign_id: number | null;
  campaign?: { id: number; name: string } | null;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  interest: string | null;
  lead_source: LeadSource | null;
  lead_score: number;
  status: LeadStatus;
  converted_to_customer_id: number | null;
  convertedCustomer?: { id: number; name: string } | null;
  createdAt?: string;
}

export interface ListLeadsParams {
  status?: LeadStatus;
  campaign_id?: number;
  lead_source?: LeadSource;
  page?: number;
  limit?: number;
}

export interface CreateLeadInput {
  campaign_id?: number;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  interest?: string;
  lead_source?: LeadSource;
  lead_score?: number;
}

export type UpdateLeadInput = Partial<CreateLeadInput>;

/** `GET /api/marketing/leads` — listagem paginada, filtros opcionais por `status`/`campaign_id`/`lead_source`. */
export async function listLeads(params: ListLeadsParams = {}) {
  const { data } = await httpClient.get<ListResponse<Lead>>('/api/marketing/leads', { params });
  return data;
}

/** `GET /api/marketing/leads/:id` — busca por id. */
export async function getLead(id: number) {
  const { data } = await httpClient.get<ItemResponse<Lead>>(`/api/marketing/leads/${id}`);
  return data.data;
}

/** `POST /api/marketing/leads` — cria um lead (404 se `campaign_id` informado e inexistente). */
export async function createLead(input: CreateLeadInput) {
  const { data } = await httpClient.post<ItemResponse<Lead>>('/api/marketing/leads', input);
  return data.data;
}

/** `PUT /api/marketing/leads/:id` — atualiza dados cadastrais do lead (não altera `status`). */
export async function updateLead(id: number, input: UpdateLeadInput) {
  const { data } = await httpClient.put<ItemResponse<Lead>>(`/api/marketing/leads/${id}`, input);
  return data.data;
}

/** `POST /api/marketing/leads/:id/status` — avança o lead no funil (ação dedicada). */
export async function changeLeadStatus(id: number, status: LeadStatus, converted_to_customer_id?: number) {
  const { data } = await httpClient.post<ItemResponse<Lead>>(`/api/marketing/leads/${id}/status`, {
    status,
    converted_to_customer_id,
  });
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
  file_path: string | null;
  version: string;
  approved: boolean;
  createdAt?: string;
}

export interface ListMaterialsParams {
  material_type?: MaterialType;
  product_id?: string;
  approved?: boolean;
  page?: number;
  limit?: number;
}

export interface CreateMaterialInput {
  title: string;
  material_type: MaterialType;
  product_id?: string;
  version?: string;
  approved?: boolean;
}

export type UpdateMaterialInput = Partial<CreateMaterialInput>;

/** `GET /api/marketing/materials` — listagem paginada, filtros opcionais por `material_type`/`product_id`/`approved`. */
export async function listMaterials(params: ListMaterialsParams = {}) {
  const { data } = await httpClient.get<ListResponse<Material>>('/api/marketing/materials', { params });
  return data;
}

/** `GET /api/marketing/materials/:id` — busca por id. */
export async function getMaterial(id: number) {
  const { data } = await httpClient.get<ItemResponse<Material>>(`/api/marketing/materials/${id}`);
  return data.data;
}

/** `POST /api/marketing/materials` — cria os metadados de um material (arquivo enviado depois). */
export async function createMaterial(input: CreateMaterialInput) {
  const { data } = await httpClient.post<ItemResponse<Material>>('/api/marketing/materials', input);
  return data.data;
}

/** `PUT /api/marketing/materials/:id` — atualiza metadados do material. */
export async function updateMaterial(id: number, input: UpdateMaterialInput) {
  const { data } = await httpClient.put<ItemResponse<Material>>(`/api/marketing/materials/${id}`, input);
  return data.data;
}

/** `POST /api/marketing/materials/:id/file` — envia/substitui o arquivo do material. */
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
