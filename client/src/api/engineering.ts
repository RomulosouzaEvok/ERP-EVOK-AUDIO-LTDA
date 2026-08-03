import { httpClient } from './httpClient';
import type { ItemResponse, ListResponse } from './types';

// ---------------------------------------------------------------------
// Projetos de Engenharia (P&D)
// ---------------------------------------------------------------------

export type EngineeringProjectType = 'new_product' | 'improvement' | 'customization' | 'research';
export type EngineeringProjectStage = 'concept' | 'design' | 'prototype' | 'testing' | 'homologation' | 'production';
export type EngineeringProjectStatus = 'active' | 'paused' | 'completed' | 'canceled';
export type EngineeringProjectPriority = 'low' | 'normal' | 'high' | 'critical';

export interface EngineeringProject {
  id: number;
  project_code: string;
  name: string;
  description: string | null;
  project_type: EngineeringProjectType | null;
  product_id: number | null;
  project_manager_id: number | null;
  start_date: string | null;
  target_date: string | null;
  completion_date: string | null;
  budget: string | number | null;
  actual_cost: string | number | null;
  stage: EngineeringProjectStage;
  status: EngineeringProjectStatus;
  priority: EngineeringProjectPriority;
  notes: string | null;
  createdAt: string;
  product?: { id: number; name: string; code: string };
  projectManager?: { id: number; name: string };
}

export interface EngineeringProjectListParams {
  page?: number;
  limit?: number;
  status?: EngineeringProjectStatus;
  stage?: EngineeringProjectStage;
}

export interface EngineeringProjectCreateInput {
  project_code: string;
  name: string;
  description?: string;
  project_type?: EngineeringProjectType;
  product_id?: number;
  project_manager_id?: number;
  start_date?: string;
  target_date?: string;
  budget?: number;
  priority?: EngineeringProjectPriority;
  notes?: string;
}

export interface EngineeringProjectUpdateInput {
  project_code?: string;
  name?: string;
  description?: string;
  project_type?: EngineeringProjectType;
  product_id?: number | null;
  project_manager_id?: number | null;
  start_date?: string | null;
  target_date?: string | null;
  completion_date?: string | null;
  budget?: number | null;
  actual_cost?: number;
  stage?: EngineeringProjectStage;
  status?: EngineeringProjectStatus;
  priority?: EngineeringProjectPriority;
  notes?: string | null;
}

/** `GET /api/engineering/projects`. */
export async function listEngineeringProjects(params: EngineeringProjectListParams = {}) {
  const { data } = await httpClient.get<ListResponse<EngineeringProject>>('/api/engineering/projects', { params });
  return data;
}

/** `GET /api/engineering/projects/:id`. */
export async function getEngineeringProject(id: number) {
  const { data } = await httpClient.get<ItemResponse<EngineeringProject>>(`/api/engineering/projects/${id}`);
  return data.data;
}

/** `POST /api/engineering/projects` — 409 se `project_code` duplicado. */
export async function createEngineeringProject(input: EngineeringProjectCreateInput) {
  const { data } = await httpClient.post<ItemResponse<EngineeringProject>>('/api/engineering/projects', input);
  return data.data;
}

/** `PUT /api/engineering/projects/:id`. */
export async function updateEngineeringProject(id: number, input: EngineeringProjectUpdateInput) {
  const { data } = await httpClient.put<ItemResponse<EngineeringProject>>(`/api/engineering/projects/${id}`, input);
  return data.data;
}

// ---------------------------------------------------------------------
// Desenhos Técnicos
// ---------------------------------------------------------------------

export type ProductDrawingType = 'assembly' | 'detail' | 'exploded' | 'schematic' | 'bom';
export type ProductDrawingStatus = 'draft' | 'released' | 'obsolete' | 'canceled';

export interface ProductDrawing {
  id: number;
  product_id: number;
  drawing_number: string;
  revision: string | null;
  title: string;
  drawing_type: ProductDrawingType | null;
  status: ProductDrawingStatus;
  file_path: string | null;
  material_spec: string | null;
  dimensions: string | null;
  tolerances: string | null;
  notes: string | null;
  approved_by: number | null;
  approved_at: string | null;
  createdAt: string;
  product?: { id: number; name: string; code: string };
  approver?: { id: number; name: string };
}

export interface ProductDrawingListParams {
  page?: number;
  limit?: number;
  product_id?: number;
  status?: ProductDrawingStatus;
}

export interface ProductDrawingCreateInput {
  product_id: number;
  drawing_number: string;
  revision?: string;
  title: string;
  drawing_type?: ProductDrawingType;
  file_path?: string;
  material_spec?: string;
  dimensions?: string;
  tolerances?: string;
  notes?: string;
}

export interface ProductDrawingUpdateInput {
  drawing_number?: string;
  revision?: string;
  title?: string;
  drawing_type?: ProductDrawingType;
  file_path?: string | null;
  material_spec?: string | null;
  dimensions?: string | null;
  tolerances?: string | null;
  notes?: string | null;
}

/** `GET /api/engineering/drawings`. */
export async function listProductDrawings(params: ProductDrawingListParams = {}) {
  const { data } = await httpClient.get<ListResponse<ProductDrawing>>('/api/engineering/drawings', { params });
  return data;
}

/** `POST /api/engineering/drawings` — 409 se numero+revisao duplicados. */
export async function createProductDrawing(input: ProductDrawingCreateInput) {
  const { data } = await httpClient.post<ItemResponse<ProductDrawing>>('/api/engineering/drawings', input);
  return data.data;
}

/** `PUT /api/engineering/drawings/:id`. */
export async function updateProductDrawing(id: number, input: ProductDrawingUpdateInput) {
  const { data } = await httpClient.put<ItemResponse<ProductDrawing>>(`/api/engineering/drawings/${id}`, input);
  return data.data;
}

/** `POST /api/engineering/drawings/:id/release` — libera desenho (draft -> released). Somente admin. */
export async function releaseProductDrawing(id: number) {
  const { data } = await httpClient.post<ItemResponse<ProductDrawing>>(`/api/engineering/drawings/${id}/release`);
  return data.data;
}

/** `POST /api/engineering/drawings/:id/obsolete` — torna desenho obsoleto (released -> obsolete). Somente admin. */
export async function obsoleteProductDrawing(id: number) {
  const { data } = await httpClient.post<ItemResponse<ProductDrawing>>(`/api/engineering/drawings/${id}/obsolete`);
  return data.data;
}

// ---------------------------------------------------------------------
// Ficha Técnica Thiele-Small (ItemEspecificacaoTecnica)
// ---------------------------------------------------------------------

/**
 * Os 13 parâmetros Thiele-Small persistidos dentro do JSONB `atributos` de
 * `ItemEspecificacaoTecnica` (ver `engineeringValidators.ts` no backend).
 */
export interface ThieleSmallParams {
  fs_hz?: number;
  qms?: number;
  qes?: number;
  qts?: number;
  vas_l?: number;
  sd_cm2?: number;
  xmax_mm?: number;
  re_ohms?: number;
  le_mh?: number;
  bl_tm?: number;
  mms_g?: number;
  cms_mm_n?: number;
  spl_db?: number;
}

export interface ItemTechnicalSpec {
  item_id: string;
  familia_tecnica: string | null;
  atributos: ThieleSmallParams;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpsertTechnicalSpecInput {
  familia_tecnica?: string;
  atributos: ThieleSmallParams;
}

/** `GET /api/engineering/items/:itemId/technical-spec` — 404 se item não existe. */
export async function getItemTechnicalSpec(itemId: string) {
  const { data } = await httpClient.get<ItemResponse<ItemTechnicalSpec | null>>(
    `/api/engineering/items/${itemId}/technical-spec`,
  );
  return data.data;
}

/** `PUT /api/engineering/items/:itemId/technical-spec` — upsert da ficha técnica de um item. */
export async function upsertItemTechnicalSpec(itemId: string, input: UpsertTechnicalSpecInput) {
  const { data } = await httpClient.put<ItemResponse<ItemTechnicalSpec>>(
    `/api/engineering/items/${itemId}/technical-spec`,
    input,
  );
  return data.data;
}
