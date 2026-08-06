import { httpClient } from './httpClient';
import type { ItemResponse, ListResponse } from './types';
import type { HandoffSignal } from '@/components/HandoffDot';

export type SaleStatus = 'quote' | 'confirmed' | 'partially_invoiced' | 'invoiced' | 'shipped' | 'canceled';

export interface SaleItem {
  id: number;
  product_id: number;
  quantity: string;
  unit_price: string;
  total_price: string;
  /** Quantidade já faturada (NF-e), cumulativa entre emissões parciais (gap 3/3). */
  invoiced_quantity?: string;
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
  /**
   * Semáforo de handoff (UC-40, Bloco 3) — fila de Expedição. `invoiced` =
   * verde; `nfe_status='processing'` = amarelo; `denied`/`cancelled`/venda
   * cancelada = vermelho. Calculado on-the-fly, nunca persistido.
   */
  handoff_signal?: HandoffSignal;
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

/** `GET /api/sales/:id` — inclui `items` (com `product`) e `customer`. */
export async function getSale(id: number) {
  const { data } = await httpClient.get<ItemResponse<Sale>>(`/api/sales/${id}`);
  return data.data;
}

/**
 * `PUT /api/sales/:id/items` — substitui o conjunto de itens de uma venda
 * `quote`/`confirmed` (gap 2/3, "Alteração de pedido"). `sale_item_id`
 * omitido = linha nova; informado = atualiza a linha existente.
 */
export async function editSaleItems(id: number, items: Array<SaleItemInput & { sale_item_id?: number }>) {
  const { data } = await httpClient.put<ItemResponse<Sale>>(`/api/sales/${id}/items`, { items });
  return data.data;
}

// ---------------------------------------------------------------------------
// Tabela de preços por cliente (gap 1/3, "Tabela de preços por cliente")
// ---------------------------------------------------------------------------

export interface CustomerPrice {
  id: number;
  customer_id: number;
  product_id: number;
  unit_price: string;
  currency: string;
  valid_from: string | null;
  valid_until: string | null;
  active: boolean;
  product?: { id: number; name: string; code: string };
}

export interface CustomerPriceInput {
  product_id: number;
  unit_price: number;
  currency?: string;
  valid_from?: string;
  valid_until?: string;
}

/** `GET /api/sales/customers/:id/prices`. */
export async function listCustomerPrices(customerId: number, params: { product_id?: number; active_only?: boolean } = {}) {
  const { data } = await httpClient.get<ItemResponse<CustomerPrice[]>>(`/api/sales/customers/${customerId}/prices`, { params });
  return data.data;
}

/** `POST /api/sales/customers/:id/prices`. */
export async function createCustomerPrice(customerId: number, input: CustomerPriceInput) {
  const { data } = await httpClient.post<ItemResponse<CustomerPrice>>(`/api/sales/customers/${customerId}/prices`, input);
  return data.data;
}

/** `PUT /api/sales/customers/:id/prices/:priceId`. */
export async function updateCustomerPrice(customerId: number, priceId: number, input: Partial<CustomerPriceInput>) {
  const { data } = await httpClient.put<ItemResponse<CustomerPrice>>(`/api/sales/customers/${customerId}/prices/${priceId}`, input);
  return data.data;
}

/** `DELETE /api/sales/customers/:id/prices/:priceId` — desativa (soft delete), não remove fisicamente. */
export async function deactivateCustomerPrice(customerId: number, priceId: number) {
  const { data } = await httpClient.delete<ItemResponse<CustomerPrice>>(`/api/sales/customers/${customerId}/prices/${priceId}`);
  return data.data;
}
