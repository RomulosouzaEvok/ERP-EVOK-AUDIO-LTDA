import { httpClient } from './httpClient';
import type { ItemResponse, ListResponse } from './types';

export type PurchaseStatus = 'pending' | 'approved' | 'sent' | 'partial' | 'received' | 'canceled';

export interface PurchaseItem {
  id: number;
  product_id: number;
  quantity: string;
  received_quantity: string;
  unit_price: string;
  product?: { id: number; name: string; code: string };
}

export interface Purchase {
  id: number;
  order_number: string;
  supplier_id: number;
  status: PurchaseStatus;
  total_amount: string;
  expected_date?: string | null;
  createdAt: string;
  supplier?: { id: number; company_name: string };
  items?: PurchaseItem[];
}

export interface PurchaseItemInput {
  product_id: number;
  quantity: number;
  unit_price: number;
}

export interface CreatePurchaseInput {
  supplier_id: number;
  items: PurchaseItemInput[];
  notes?: string;
  expected_date?: string;
}

/** `GET /api/purchases`. */
export async function listPurchases(params: { page?: number; limit?: number; status?: PurchaseStatus; supplier_id?: number } = {}) {
  const { data } = await httpClient.get<ListResponse<Purchase>>('/api/purchases', { params });
  return data;
}

/** `POST /api/purchases`. */
export async function createPurchase(input: CreatePurchaseInput) {
  const { data } = await httpClient.post<ItemResponse<Purchase>>('/api/purchases', input);
  return data.data;
}

/** `PUT /api/purchases/:id/status`. */
export async function updatePurchaseStatus(id: number, status: PurchaseStatus) {
  const { data } = await httpClient.put<ItemResponse<Purchase>>(`/api/purchases/${id}/status`, { status });
  return data.data;
}

export interface ReceivePurchaseItemInput {
  item_id: number;
  quantity: number;
  lot_number?: string;
}

/** `POST /api/purchases/:id/receive`. */
export async function receivePurchaseItems(id: number, items: ReceivePurchaseItemInput[]) {
  const { data } = await httpClient.post<ItemResponse<Purchase>>(`/api/purchases/${id}/receive`, { items });
  return data.data;
}
