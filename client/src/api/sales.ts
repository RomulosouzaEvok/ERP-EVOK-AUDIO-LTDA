import { httpClient } from './httpClient';
import type { ItemResponse, ListResponse } from './types';

export type SaleStatus = 'quote' | 'confirmed' | 'invoiced' | 'canceled';

export interface SaleItem {
  id: number;
  product_id: number;
  quantity: string;
  unit_price: string;
  total_price: string;
  product?: { id: number; name: string; code: string };
}

export interface Sale {
  id: number;
  customer_id: number;
  total_amount: string;
  discount: string;
  status: SaleStatus;
  payment_method?: string | null;
  installments: number;
  createdAt: string;
  customer?: { id: number; name: string };
  items?: SaleItem[];
  nfe_status?: 'pending' | 'processing' | 'authorized' | 'denied' | 'cancelled';
  nfe_number?: string | null;
  nfe_key?: string | null;
  nfe_xml_url?: string | null;
  nfe_danfe_url?: string | null;
  nfe_error_message?: string | null;
  nfe_issued_at?: string | null;
}

export interface SaleItemInput {
  product_id: number;
  quantity: number;
  unit_price: number;
}

export interface CreateSaleInput {
  customer_id: number;
  items: SaleItemInput[];
  discount?: number;
  payment_method?: 'cash' | 'credit_card' | 'debit_card' | 'pix' | 'boleto' | 'check';
  installments?: number;
  notes?: string;
}

/** `GET /api/sales`. */
export async function listSales(params: { page?: number; limit?: number; status?: SaleStatus; customer_id?: number } = {}) {
  const { data } = await httpClient.get<ListResponse<Sale>>('/api/sales', { params });
  return data;
}

/** `POST /api/sales`. */
export async function createSale(input: CreateSaleInput) {
  const { data } = await httpClient.post<ItemResponse<Sale>>('/api/sales', input);
  return data.data;
}

/** `PUT /api/sales/:id/status`. */
export async function updateSaleStatus(id: number, status: SaleStatus) {
  const { data } = await httpClient.put<ItemResponse<Sale>>(`/api/sales/${id}/status`, { status });
  return data.data;
}
