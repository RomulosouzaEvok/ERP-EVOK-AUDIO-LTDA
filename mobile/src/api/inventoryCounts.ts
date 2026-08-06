/**
 * Client do submódulo `inventory-counts` (Inventário Cíclico / Contagens),
 * base `/api/inventory-counts`. Contratos exatos confirmados em
 * `server/src/modules/inventory/presentation/controllers/inventoryCountController.ts`,
 * `server/src/modules/inventory/application/use-cases/*.ts` e
 * `docs/arquitetura/API.md` (seção 8.2).
 *
 * Fluxo coberto pelo app mobile (aprovar/rejeitar continuam exclusivos do
 * painel web):
 *   GET  /api/inventory-counts?assigned_to=me            -> minhas contagens
 *   GET  /api/inventory-counts?unassigned=true&status=draft -> pool
 *   GET  /api/inventory-counts/:id                        -> detalhe + itens
 *   POST /api/inventory-counts/:id/start                  -> "pega"/inicia (claim atômico do pool; 409 se já é de outro funcionário)
 *   POST /api/inventory-counts/:id/items/:itemId/count    -> registra contagem física de 1 item
 *   POST /api/inventory-counts/:id/submit                 -> envia para aprovação
 */

import { apiRequest } from './client';
import type {
  InventoryCount,
  InventoryCountDetail,
  InventoryCountItemDTO,
  ListInventoryCountsResponse,
} from './types';

interface DetailApiResponse {
  success: true;
  data: InventoryCountDetail;
}

interface ItemApiResponse {
  success: true;
  data: InventoryCountItemDTO;
}

/** Página padrão usada nas listagens paginadas de contagens (`page`/`limit`, ver `PaginationMeta`). */
export const INVENTORY_COUNTS_PAGE_LIMIT = 20;

export interface ListInventoryCountsPageParams {
  page?: number;
  limit?: number;
}

/** Contagens atribuídas ao usuário logado (`assigned_to=me`), paginado. */
export async function listMyInventoryCounts(
  params: ListInventoryCountsPageParams = {}
): Promise<ListInventoryCountsResponse> {
  const { page = 1, limit = INVENTORY_COUNTS_PAGE_LIMIT } = params;
  return apiRequest<ListInventoryCountsResponse>('/inventory-counts', {
    method: 'GET',
    query: { assigned_to: 'me', page, limit },
  });
}

/** Contagens disponíveis no "pool" (sem responsável, status `draft`), livres para qualquer funcionário pegar. Paginado. */
export async function listPoolInventoryCounts(
  params: ListInventoryCountsPageParams = {}
): Promise<ListInventoryCountsResponse> {
  const { page = 1, limit = INVENTORY_COUNTS_PAGE_LIMIT } = params;
  return apiRequest<ListInventoryCountsResponse>('/inventory-counts', {
    method: 'GET',
    query: { unassigned: 'true', status: 'draft', page, limit },
  });
}

/** Busca uma contagem por id, com os itens (`InventoryCountItemDTO[]`). */
export async function getInventoryCount(id: number | string): Promise<InventoryCountDetail> {
  const response = await apiRequest<DetailApiResponse>(`/inventory-counts/${id}`, { method: 'GET' });
  return response.data;
}

/**
 * Inicia a contagem (`draft` -> `counting`). Se estava no pool, faz o claim
 * atômico para o usuário logado; se já é de outro funcionário, o backend
 * responde 409 (`ApiError.status === 409`, tratado pela tela).
 */
export async function startInventoryCount(id: number | string): Promise<InventoryCountDetail> {
  const response = await apiRequest<DetailApiResponse>(`/inventory-counts/${id}/start`, { method: 'POST' });
  return response.data;
}

export interface CountInventoryItemPayload {
  counted_quantity: number;
  notes?: string;
}

/** Registra a quantidade contada fisicamente de um item da contagem. */
export async function countInventoryCountItem(
  countId: number | string,
  itemId: number | string,
  payload: CountInventoryItemPayload
): Promise<InventoryCountItemDTO> {
  const response = await apiRequest<ItemApiResponse>(`/inventory-counts/${countId}/items/${itemId}/count`, {
    method: 'POST',
    body: payload,
  });
  return response.data;
}

/** Envia a contagem completa para aprovação (`counting` -> `pending_approval`). Exige todos os itens já contados. */
export async function submitInventoryCount(id: number | string): Promise<InventoryCountDetail> {
  const response = await apiRequest<DetailApiResponse>(`/inventory-counts/${id}/submit`, { method: 'POST' });
  return response.data;
}
