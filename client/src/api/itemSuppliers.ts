import { httpClient } from './httpClient';
import type { ItemResponse, ListResponse } from './types';

/** Vínculo item ↔ fornecedor (preço, prazo, MOQ, código do fornecedor para o item). */
export interface ItemSupplierLink {
  id: number;
  item_id: string;
  supplier_id: number;
  supplier: { id: number; company_name: string };
  unit_price: string | number | null;
  currency: string | null;
  lead_time_days: number | null;
  moq: string | number | null;
  supplier_item_code: string | null;
  preferred: boolean;
  active: boolean;
  notes: string | null;
}

export interface ItemSupplierInput {
  supplier_id: number;
  unit_price?: number;
  currency?: string;
  lead_time_days?: number;
  moq?: number;
  supplier_item_code?: string;
  preferred?: boolean;
  notes?: string;
}

/** Histórico de compras do item, agregado por fornecedor. */
export interface ItemPurchaseHistoryEntry {
  supplier_id: number;
  company_name: string;
  orders_count: number;
  total_quantity: string | number;
  min_price: string | number;
  max_price: string | number;
  avg_price: string | number;
  last_order_date: string | null;
}

/** `GET /api/items/:id/suppliers` — vínculos de fornecedores do item. */
export async function listItemSuppliers(itemId: string) {
  const { data } = await httpClient.get<ListResponse<ItemSupplierLink>>(`/api/items/${itemId}/suppliers`);
  return data;
}

/** `POST /api/items/:id/suppliers` — cria vínculo item ↔ fornecedor. */
export async function createItemSupplier(itemId: string, input: ItemSupplierInput) {
  const { data } = await httpClient.post<ItemResponse<ItemSupplierLink>>(`/api/items/${itemId}/suppliers`, input);
  return data.data;
}

/** `PUT /api/items/:id/suppliers/:linkId` — atualiza vínculo item ↔ fornecedor. */
export async function updateItemSupplier(itemId: string, linkId: number, input: ItemSupplierInput) {
  const { data } = await httpClient.put<ItemResponse<ItemSupplierLink>>(
    `/api/items/${itemId}/suppliers/${linkId}`,
    input,
  );
  return data.data;
}

/** `DELETE /api/items/:id/suppliers/:linkId` — desativa vínculo item ↔ fornecedor. */
export async function deactivateItemSupplier(itemId: string, linkId: number) {
  await httpClient.delete(`/api/items/${itemId}/suppliers/${linkId}`);
}

/** `GET /api/items/:id/purchase-history` — histórico de compras agregado por fornecedor. */
export async function getItemPurchaseHistory(itemId: string) {
  const { data } = await httpClient.get<ItemResponse<ItemPurchaseHistoryEntry[]>>(
    `/api/items/${itemId}/purchase-history`,
  );
  return data.data;
}
