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
  /** Filtra por depósito (Bloco 4, UC-42). Aceita o `id` (INTEGER) do depósito. */
  warehouse_id?: number;
}

/** `GET /api/inventory/movements?warehouse_id=` — aceita filtro opcional por depósito (Bloco 4, UC-42). */
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

/**
 * Lote (`LotControl`) resolvido por código, com `product`/`supplier`/`warehouse`
 * incluídos (ver `GetLotByCodeUseCase`). Superset de `Lot` (`@/api/lots`), que
 * não inclui `warehouse` embutido.
 */
export interface LotByCode {
  id: number;
  product_id: number;
  supplier_id: number | null;
  purchase_id: number | null;
  production_order_id: number | null;
  lot_number: string;
  status: 'available' | 'reserved' | 'consumed' | 'blocked' | 'expired' | 'quarantine';
  quantity_initial: string;
  quantity_available: string;
  manufactured_at: string | null;
  expires_at: string | null;
  received_at: string | null;
  notes: string | null;
  warehouse_id: number | null;
  createdAt: string;
  product?: { id: number; name: string; code: string };
  supplier?: { id: number; company_name: string };
  warehouse?: { id: number; code: string; name: string };
}

/**
 * `GET /api/inventory/lots/by-code/:lot_number?product_id=` — resolve um
 * código de lote lido/digitado (scanner físico ou teclado) para o registro
 * completo de `LotControl`. `product_id` é opcional, usado apenas para
 * desambiguar quando o mesmo código existir em mais de um produto (a API
 * responde 409 nesse caso sem `product_id`).
 *
 * Lança (via `httpClient`) o erro Axios original em 404 (código não
 * encontrado) e 409 (código ambíguo) — trate com `translateApiError`/
 * `extractApiErrorMessage` na tela chamadora.
 */
export async function resolveLotByCode(lotNumber: string, productId?: number) {
  const { data } = await httpClient.get<ItemResponse<LotByCode>>(
    `/api/inventory/lots/by-code/${encodeURIComponent(lotNumber)}`,
    { params: productId ? { product_id: productId } : undefined },
  );
  return data.data;
}

export interface LotQrCodeResult {
  format: 'png' | 'svg';
  qrDataUrl?: string;
  qrSvg?: string;
  qrCodeData: string;
}

/**
 * `GET /api/inventory/lots/:id/qrcode?format=png|svg` — gera o QR Code do
 * lote (`id` numérico interno) para impressão de etiqueta. Mesmo formato de
 * `getAssetQrCode`/`getProductQrCode` — consumir com o componente genérico
 * `QrCodeDialog` (`@/components/QrCodeDialog`).
 */
export async function getLotQrCode(id: number, format: 'png' | 'svg' = 'png') {
  const { data } = await httpClient.get<ItemResponse<LotQrCodeResult>>(`/api/inventory/lots/${id}/qrcode`, {
    params: { format },
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
  /**
   * Depósito ao qual TODA a contagem pertence (Bloco 4, migration
   * `20260804-000006`). Obrigatório em contagens criadas a partir de
   * 2026-08-04; pode ser `null` apenas em 4 registros legados pré-Bloco 4
   * (já backfilled para o depósito `INSUMOS`, ver `InventoryCountEntity.ts`).
   * O backend não faz eager-load da associação `warehouse` em
   * `SequelizeInventoryCountRepository` — a tela resolve código/nome via
   * `listWarehouses()` e um mapa local por `id`.
   */
  warehouse_id: number | null;
  location?: string | null;
  /**
   * Id do funcionário responsável pela contagem (migration `20260806-000001`).
   * `null`/ausente = contagem no "pool" — qualquer funcionário autorizado
   * pode assumi-la pelo app mobile via `POST /:id/start` (claim atômico).
   */
  assigned_to?: number | null;
  /** Eager-loaded pelo backend (`SequelizeInventoryCountRepository`, alias `assignedTo`) — nome/id do responsável, quando houver. */
  assignedTo?: { id: number; name: string } | null;
  createdAt: string;
  items?: InventoryCountItem[];
}

/** `GET /api/inventory-counts`. */
export async function listInventoryCounts(
  params: {
    page?: number;
    limit?: number;
    status?: InventoryCountStatus;
    count_type?: InventoryCountType;
    /** Filtra por funcionário atribuído. Aceita o `id` do usuário ou o atalho `'me'` (usuário autenticado). */
    assigned_to?: number | 'me';
    /** Quando `true`, retorna apenas contagens do "pool" (sem responsável). Tem prioridade sobre `assigned_to`. */
    unassigned?: boolean;
  } = {},
) {
  const { data } = await httpClient.get<ListResponse<InventoryCount>>('/api/inventory-counts', { params });
  return data;
}

/** `GET /api/inventory-counts/:id` — inclui os itens da contagem. */
export async function getInventoryCount(id: number) {
  const { data } = await httpClient.get<ItemResponse<InventoryCount>>(`/api/inventory-counts/${id}`);
  return data.data;
}

/**
 * Payload de criação de contagem de inventário (Bloco 4, migration
 * `20260804-000006`). `warehouse_id` é OBRIGATÓRIO — validado tanto pelo
 * schema Zod do backend (`createInventoryCountSchema`) quanto por
 * `InventoryCountEntity` (defesa em profundidade), a contagem inteira
 * (cabeçalho + itens) é escopada a um único depósito.
 */
export interface CreateInventoryCountInput {
  count_type?: InventoryCountType;
  /** Depósito contado — obrigatório (ver `createInventoryCountSchema` no backend). */
  warehouse_id: number;
  location?: string;
  product_ids: number[];
  /**
   * Funcionário responsável pela contagem (opcional, migration
   * `20260806-000001`). Ausente/`null` deixa a contagem no "pool" — qualquer
   * funcionário autorizado pode pegá-la depois pelo app mobile.
   */
  assigned_to?: number | null;
}

/** `POST /api/inventory-counts` — cria já com os produtos selecionados, escopada a um depósito. */
export async function createInventoryCount(input: CreateInventoryCountInput) {
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
