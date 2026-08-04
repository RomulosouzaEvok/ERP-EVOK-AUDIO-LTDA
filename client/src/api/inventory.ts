import { httpClient } from './httpClient';
import type { ItemResponse, ListResponse } from './types';
import type { Product } from './products';

export type InventoryMovementType = 'in' | 'out' | 'adjustment';

export interface InventoryMovement {
  id: number;
  product_id: number;
  type: InventoryMovementType;
  quantity: string;
  description?: string;
  reference_id?: number | string | null;
  reference_type?: string | null;
  createdAt: string;
  product?: { id: number; name: string; code: string };
}

export interface InventoryMovementListParams {
  page?: number;
  limit?: number;
  product_id?: number;
  type?: InventoryMovementType;
  start_date?: string;
  end_date?: string;
}

/** `GET /api/inventory/movements`. */
export async function listMovements(params: InventoryMovementListParams = {}) {
  const { data } = await httpClient.get<ListResponse<InventoryMovement>>('/api/inventory/movements', { params });
  return data;
}

export interface CreateInventoryMovementInput {
  product_id: number;
  type: 'in' | 'out';
  quantity: number;
  description: string;
  /** Código do depósito onde a movimentação ocorre (Bloco 4, UC-42). Default `'INSUMOS'` quando ausente. */
  warehouse_code?: string;
}

/**
 * `POST /api/inventory/movements` — movimentação manual de estoque com
 * dual-write em `product_warehouse_stock` (Bloco 4, UC-42). Preferível a
 * `productsApi.createStockMovement` (`POST /api/products/movements`, que
 * NÃO aceita `warehouse_code`) sempre que o depósito precisar ser
 * informado.
 */
export async function createMovement(input: CreateInventoryMovementInput) {
  const { data } = await httpClient.post<ItemResponse<InventoryMovement>>('/api/inventory/movements', input);
  return data.data;
}

/** `GET /api/inventory/low-stock`. */
export async function listLowStock() {
  const { data } = await httpClient.get<ItemResponse<Product[]>>('/api/inventory/low-stock');
  return data.data;
}

export interface StockReportSummary {
  total_products: number;
  total_items: number;
  total_value: number;
  low_stock_count: number;
}

/** `GET /api/inventory/stock-report` — resumo consolidado + produtos ativos (não paginado). */
export async function getStockReport() {
  const { data } = await httpClient.get<ItemResponse<{ summary: StockReportSummary; products: Product[] }>>(
    '/api/inventory/stock-report',
  );
  return data.data;
}

export interface AvailableLot {
  id: number;
  product_id: number;
  lot_number: string;
  quantity_available: string;
}

/** `GET /api/inventory/lots?product_id=X` — lotes com saldo disponível para consumo. */
export async function listAvailableLots(productId: number) {
  const { data } = await httpClient.get<ItemResponse<AvailableLot[]>>('/api/inventory/lots', {
    params: { product_id: productId },
  });
  return data.data;
}

export type InventoryCountStatus = 'draft' | 'counting' | 'pending_approval' | 'approved' | 'rejected' | 'adjusted';
export type InventoryCountType = 'cycle' | 'full' | 'spot';

export interface InventoryCountItem {
  id: number;
  product_id: number;
  system_quantity: string;
  counted_quantity: string | null;
  variance_quantity: string | null;
  status: 'pending' | 'counted' | 'adjusted';
  product?: { id: number; name: string; code: string; quantity: string };
}

export interface InventoryCount {
  id: number;
  count_number: string;
  status: InventoryCountStatus;
  count_type: InventoryCountType;
  location?: string | null;
  createdAt: string;
  items?: InventoryCountItem[];
}

/** `GET /api/inventory-counts`. */
export async function listInventoryCounts(params: { page?: number; limit?: number; status?: InventoryCountStatus } = {}) {
  const { data } = await httpClient.get<ListResponse<InventoryCount>>('/api/inventory-counts', { params });
  return data;
}

/** `GET /api/inventory-counts/:id` — inclui os itens da contagem. */
export async function getInventoryCount(id: number) {
  const { data } = await httpClient.get<ItemResponse<InventoryCount>>(`/api/inventory-counts/${id}`);
  return data.data;
}

/** `POST /api/inventory-counts` — cria já com os produtos selecionados. */
export async function createInventoryCount(input: { count_type?: InventoryCountType; location?: string; product_ids: number[] }) {
  const { data } = await httpClient.post<ItemResponse<{ count: InventoryCount; items: InventoryCountItem[] }>>(
    '/api/inventory-counts',
    input,
  );
  return data.data;
}

/** `POST /api/inventory-counts/:id/start`. */
export async function startInventoryCount(id: number) {
  const { data } = await httpClient.post<ItemResponse<InventoryCount>>(`/api/inventory-counts/${id}/start`);
  return data.data;
}

/** `POST /api/inventory-counts/:id/items/:itemId/count`. */
export async function countInventoryItem(id: number, itemId: number, countedQuantity: number, notes?: string) {
  const { data } = await httpClient.post<ItemResponse<InventoryCountItem>>(
    `/api/inventory-counts/${id}/items/${itemId}/count`,
    { counted_quantity: countedQuantity, notes },
  );
  return data.data;
}

/** `POST /api/inventory-counts/:id/submit`. */
export async function submitInventoryCount(id: number) {
  const { data } = await httpClient.post<ItemResponse<InventoryCount>>(`/api/inventory-counts/${id}/submit`);
  return data.data;
}

/** `POST /api/inventory-counts/:id/approve` — dispara ajuste real de estoque para os itens com variância. */
export async function approveInventoryCount(id: number) {
  const { data } = await httpClient.post<ItemResponse<{ count: InventoryCount; adjustments: unknown[] }>>(
    `/api/inventory-counts/${id}/approve`,
  );
  return data.data;
}

/** `POST /api/inventory-counts/:id/reject`. */
export async function rejectInventoryCount(id: number, reason?: string) {
  const { data } = await httpClient.post<ItemResponse<InventoryCount>>(`/api/inventory-counts/${id}/reject`, { reason });
  return data.data;
}
