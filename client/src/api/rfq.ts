import { httpClient } from './httpClient';
import type { ItemResponse, ListResponse } from './types';

export type RfqStatus = 'draft' | 'sent' | 'quoted' | 'awarded' | 'cancelled';

export type RfqSupplierStatus = 'invited' | 'responded' | 'declined';

export interface RfqQuote {
  id: number;
  supplier_id: number;
  unit_price: string | number;
  lead_time_days: number | null;
  moq: string | number | null;
  validity_date: string | null;
  notes: string | null;
  supplier?: { id: number; company_name: string };
}

export interface RfqItem {
  id: number;
  item_id: string;
  quantity: string | number;
  unit: string | null;
  awarded_supplier_id: number | null;
  awarded_unit_price: string | number | null;
  item?: { id: string; codigo: string; descricao: string };
  quotes?: RfqQuote[];
}

export interface RfqSupplierInvite {
  id: number;
  supplier_id: number;
  status: RfqSupplierStatus;
  invited_at: string;
  responded_at: string | null;
  supplier?: { id: number; company_name: string };
}

/** Cotacao (RFQ) multi-fornecedor — origem opcional em Requisicao de Compra, ou avulsa. */
export interface Rfq {
  id: number;
  rfq_number: string;
  requisition_id: number | null;
  requisition?: { id: number; requisition_number: string } | null;
  status: RfqStatus;
  created_by: number;
  createdBy?: { id: number; name: string; email: string };
  response_deadline: string | null;
  notes: string | null;
  items: RfqItem[];
  suppliers: RfqSupplierInvite[];
  createdAt?: string;
}

export interface CreateRfqInput {
  /** Se informado, os itens sao puxados automaticamente da requisicao (nao envie `items` junto). */
  requisition_id?: number;
  items?: { item_id: string; quantity: number; unit?: string }[];
  response_deadline?: string;
  notes?: string;
}

export interface RfqListParams {
  page?: number;
  limit?: number;
  status?: RfqStatus;
  requisition_id?: number;
}

/** `GET /api/rfqs` — listagem paginada, filtro por status/requisicao. */
export async function listRfqs(params: RfqListParams = {}) {
  const { data } = await httpClient.get<ListResponse<Rfq>>('/api/rfqs', { params });
  return data;
}

/** `GET /api/rfqs/:id` — detalhe com itens/fornecedores/cotacoes. */
export async function getRfqById(id: number) {
  const { data } = await httpClient.get<ItemResponse<Rfq>>(`/api/rfqs/${id}`);
  return data.data;
}

/** `POST /api/rfqs` — cria cotacao avulsa (`items`) ou a partir de requisicao (`requisition_id`). */
export async function createRfq(input: CreateRfqInput) {
  const { data } = await httpClient.post<ItemResponse<Rfq>>('/api/rfqs', input);
  return data.data;
}

/** `POST /api/rfqs/:id/suppliers` — convida fornecedores a cotar (transiciona draft -> sent). */
export async function inviteRfqSuppliers(id: number, supplierIds: number[]) {
  const { data } = await httpClient.post<ItemResponse<Rfq>>(`/api/rfqs/${id}/suppliers`, { supplier_ids: supplierIds });
  return data.data;
}

export interface RegisterRfqQuoteItemInput {
  rfq_item_id: number;
  unit_price: number;
  lead_time_days?: number;
  moq?: number;
  validity_date?: string;
  notes?: string;
}

export interface RegisterRfqQuoteInput {
  supplier_id: number;
  items: RegisterRfqQuoteItemInput[];
}

/** `POST /api/rfqs/:id/quotes` — registra a resposta de um fornecedor (upsert por item x fornecedor). */
export async function registerRfqQuote(id: number, input: RegisterRfqQuoteInput) {
  const { data } = await httpClient.post<ItemResponse<Rfq>>(`/api/rfqs/${id}/quotes`, input);
  return data.data;
}

export interface RfqComparisonQuote {
  quote_id: number;
  supplier_id: number;
  supplier_name: string;
  unit_price: number;
  lead_time_days: number | null;
  moq: number | null;
  validity_date: string | null;
  notes: string | null;
  line_total: number;
  is_best_price: boolean;
  is_best_lead_time: boolean;
}

export interface RfqComparisonItem {
  rfq_item_id: number;
  item_id: string;
  item: { id: string; codigo: string; descricao: string } | null;
  quantity: number;
  unit: string | null;
  awarded_supplier_id: number | null;
  awarded_unit_price: number | null;
  quotes: RfqComparisonQuote[];
}

export interface RfqSupplierTotal {
  supplier_id: number;
  supplier_name: string;
  items_quoted_count: number;
  total_amount: number;
}

export interface RfqComparisonResult {
  rfq: { id: number; rfq_number: string; status: RfqStatus; requisition_id: number | null };
  items: RfqComparisonItem[];
  supplier_totals: RfqSupplierTotal[];
}

/** `GET /api/rfqs/:id/comparison` — mapa comparativo item x fornecedor. */
export async function getRfqComparison(id: number) {
  const { data } = await httpClient.get<ItemResponse<RfqComparisonResult>>(`/api/rfqs/${id}/comparison`);
  return data.data;
}

export interface AwardRfqInput {
  awards: { rfq_item_id: number; supplier_id: number }[];
  notes?: string;
}

export interface AwardedPurchaseOrder {
  id: number;
  order_number: string;
  supplier_id: number;
  status: string;
  items: unknown[];
}

export interface AwardRfqResult {
  purchase_orders: AwardedPurchaseOrder[];
  rfq_id: number;
  rfq_status: RfqStatus;
}

/**
 * `POST /api/rfqs/:id/award` — adjudica a cotacao (podendo dividir itens entre
 * fornecedores), gera pedido(s) de compra por fornecedor vencedor e
 * realimenta o catalogo item x fornecedor com o preco/prazo cotado.
 */
export async function awardRfq(id: number, input: AwardRfqInput) {
  const { data } = await httpClient.post<ItemResponse<AwardRfqResult>>(`/api/rfqs/${id}/award`, input);
  return data.data;
}
