import { httpClient } from './httpClient';
import type { ItemResponse, ListResponse } from './types';

/**
 * Cliente HTTP do Roteiro de Produção (gap G5) — `/api/production/routes`,
 * contrato em `docs/arquitetura/API.md` §33.
 *
 * Notas de contrato que a tela depende:
 * - `sequence` é o **ordinal** da etapa (1..N contígua, sem buraco). Quem casa
 *   o apontamento com a etapa é ele — por isso a tela nunca deixa o usuário
 *   digitar `sequence`: ela é derivada da posição na lista.
 * - `step_code` é o número/código de fábrica (texto livre, ex.: `"20"`), único
 *   dentro do roteiro.
 * - `created_by`/`approved_by` NÃO são aceitos no payload (schemas `.strict()`
 *   no backend, regra anti-spoofing) — vêm do JWT.
 */

/** Status possíveis do roteiro (ENUM real de `production_routes.status`). */
export type ProductionRouteStatus = 'draft' | 'active' | 'inactive' | 'superseded';

/** Códigos estáveis devolvidos pelo backend em `error.details.rule`. */
export const PRODUCTION_ROUTE_RULES = {
  ROUTE_NOT_DRAFT: 'G5-ROUTE-NOT-DRAFT',
  ROUTE_STATUS_TRANSITION: 'G5-ROUTE-STATUS-TRANSITION',
  ROUTE_CODE_DUPLICATE: 'G5-ROUTE-CODE-DUP',
  REVISION_DUPLICATE: 'G5-REVISION-DUP',
  PRODUCT_NOT_PRODUCIBLE: 'G5-PRODUCT-NOT-PRODUCIBLE',
  SEQUENCE_EMPTY: 'G5-SEQ-EMPTY',
  SEQUENCE_DUPLICATE: 'G5-SEQ-DUP',
  SEQUENCE_GAP: 'G5-SEQ-GAP',
  STEP_CODE_DUPLICATE: 'G5-STEP-CODE-DUP',
  WORK_CENTER_NOT_FOUND: 'G5-WC-NOT-FOUND',
  WORK_CENTER_INACTIVE: 'G5-WC-INACTIVE',
  ROUTE_IN_USE: 'G5-ROUTE-IN-USE',
} as const;

export type ProductionRouteRule = (typeof PRODUCTION_ROUTE_RULES)[keyof typeof PRODUCTION_ROUTE_RULES];

/** Centro de trabalho vinculado à etapa (include `workCenter` do detalhe). */
export interface RouteStepWorkCenter {
  id: number;
  code: string;
  name: string;
  active: boolean;
}

/** Etapa persistida do roteiro (`production_route_steps`). */
export interface ProductionRouteStep {
  id: number;
  production_route_id: number;
  sequence: number;
  step_code: string;
  name: string;
  work_center: string | null;
  work_center_id: number | null;
  /** DECIMAL no banco — pode chegar como string. Tempo padrão POR UNIDADE. */
  standard_time_minutes: number | string;
  /** DECIMAL no banco — pode chegar como string. Setup POR LOTE. */
  setup_time_minutes: number | string;
  instructions: string | null;
  quality_check_required: boolean;
  is_active: boolean;
  workCenter?: RouteStepWorkCenter | null;
}

/** Produto legado alvo do roteiro (include `product`). */
export interface ProductionRouteProduct {
  id: number;
  code: string;
  name: string;
  product_type: string;
  status: string;
}

/** Usuário que criou/aprovou (includes `createdBy`/`approvedBy`). */
export interface ProductionRouteUser {
  id: number;
  name: string;
  email: string;
}

/** Cabeçalho do roteiro, como vem na listagem. */
export interface ProductionRoute {
  id: number;
  product_id: number;
  item_id: string | null;
  route_code: string;
  revision: string;
  status: ProductionRouteStatus;
  description: string | null;
  total_standard_time_minutes: number | string;
  created_by: number | null;
  approved_by: number | null;
  approved_at: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  product?: ProductionRouteProduct | null;
  item?: { id: string; codigo: string; descricao: string } | null;
}

/** Detalhe do roteiro (`GET /:id`) — etapas + totais derivados. */
export interface ProductionRouteDetail extends ProductionRoute {
  steps: ProductionRouteStep[];
  /** Derivado na leitura pelo backend (não persistido). */
  total_setup_time_minutes: number;
  steps_count: number;
  createdBy?: ProductionRouteUser | null;
  approvedBy?: ProductionRouteUser | null;
}

/** Etapa no formato aceito pelo backend (`POST /` e `PUT /:id/steps`). */
export interface ProductionRouteStepInput {
  sequence: number;
  step_code: string;
  name: string;
  work_center_id?: number | null;
  standard_time_minutes: number;
  setup_time_minutes: number;
  instructions?: string | null;
  quality_check_required: boolean;
  is_active: boolean;
}

export interface ListProductionRoutesParams {
  product_id?: number;
  status?: ProductionRouteStatus;
  route_code?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateProductionRouteInput {
  product_id: number;
  route_code: string;
  revision?: string;
  description?: string | null;
  steps?: ProductionRouteStepInput[];
}

export interface UpdateProductionRouteInput {
  route_code?: string;
  revision?: string;
  description?: string | null;
}

export interface ReviseProductionRouteInput {
  revision?: string;
  route_code?: string;
  description?: string | null;
}

/** Resposta da ativação: o roteiro liberado + qual revisão foi substituída. */
export interface ActivateProductionRouteResult {
  route: ProductionRoute;
  /** `null` quando o produto ainda não tinha revisão ativa. */
  superseded_route_id: number | null;
}

/** `GET /api/production/routes`. */
export async function listProductionRoutes(params: ListProductionRoutesParams = {}) {
  const { data } = await httpClient.get<ListResponse<ProductionRoute>>('/api/production/routes', { params });
  return data;
}

/** `GET /api/production/routes/:id` — cabeçalho + etapas ordenadas + totais. */
export async function getProductionRouteById(id: number) {
  const { data } = await httpClient.get<ItemResponse<ProductionRouteDetail>>(`/api/production/routes/${id}`);
  return data.data;
}

/** `POST /api/production/routes` — nasce sempre em rascunho. */
export async function createProductionRoute(input: CreateProductionRouteInput) {
  const { data } = await httpClient.post<ItemResponse<ProductionRoute>>('/api/production/routes', input);
  return data.data;
}

/** `PUT /api/production/routes/:id` — cabeçalho, só em rascunho. */
export async function updateProductionRoute(id: number, input: UpdateProductionRouteInput) {
  const { data } = await httpClient.put<ItemResponse<ProductionRoute>>(`/api/production/routes/${id}`, input);
  return data.data;
}

/** `PUT /api/production/routes/:id/steps` — substituição TOTAL das etapas, só em rascunho. */
export async function replaceProductionRouteSteps(id: number, steps: ProductionRouteStepInput[]) {
  const { data } = await httpClient.put<ItemResponse<ProductionRouteStep[]>>(
    `/api/production/routes/${id}/steps`,
    { steps },
  );
  return data.data;
}

/** `PATCH /api/production/routes/:id/activate` — libera e congela o roteiro (exige alçada de gestor). */
export async function activateProductionRoute(id: number): Promise<ActivateProductionRouteResult> {
  const { data } = await httpClient.patch<ItemResponse<ProductionRoute> & { meta?: { superseded_route_id: number | null } }>(
    `/api/production/routes/${id}/activate`,
  );
  return { route: data.data, superseded_route_id: data.meta?.superseded_route_id ?? null };
}

/** `PATCH /api/production/routes/:id/inactivate` — aposenta o roteiro ativo (exige alçada de gestor). */
export async function inactivateProductionRoute(id: number) {
  const { data } = await httpClient.patch<ItemResponse<ProductionRoute>>(`/api/production/routes/${id}/inactivate`);
  return data.data;
}

/** `POST /api/production/routes/:id/revise` — clona em uma nova revisão rascunho. */
export async function reviseProductionRoute(id: number, input: ReviseProductionRouteInput = {}) {
  const { data } = await httpClient.post<ItemResponse<ProductionRoute>>(
    `/api/production/routes/${id}/revise`,
    input,
  );
  return data.data;
}

/** `DELETE /api/production/routes/:id` — só rascunho nunca apontado. */
export async function removeProductionRoute(id: number) {
  const { data } = await httpClient.delete<ItemResponse<{ id: number }>>(`/api/production/routes/${id}`);
  return data.data;
}
