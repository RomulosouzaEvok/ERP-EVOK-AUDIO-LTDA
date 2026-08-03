import { httpClient } from './httpClient';
import type { ItemResponse, ListResponse } from './types';

export type RequisitionPriority = 'normal' | 'urgent' | 'emergency';

export type RequisitionStatus = 'draft' | 'pending' | 'approved' | 'ordered' | 'partial' | 'received' | 'canceled';

export interface RequisitionItem {
  id: number;
  item_id: string;
  quantity: string | number;
  unit: string | null;
  item?: { id: string; codigo: string; descricao: string };
}

/** Requisição de compra — origem obrigatória da cadeia de suprimentos (rastreabilidade). */
export interface PurchaseRequisition {
  id: number;
  requisition_number: string;
  requester: { id: number; name: string };
  request_date: string;
  priority: RequisitionPriority;
  status: RequisitionStatus;
  origin: string | null;
  notes: string | null;
  items: RequisitionItem[];
}

export interface RequisitionItemInput {
  item_id: string;
  quantity: number;
  unit?: string;
  notes?: string;
}

export interface CreateRequisitionInput {
  priority?: RequisitionPriority;
  status?: 'draft' | 'pending';
  origin?: string;
  notes?: string;
  request_date?: string;
  items: RequisitionItemInput[];
}

export interface RequisitionListParams {
  page?: number;
  limit?: number;
  status?: RequisitionStatus;
}

/** `GET /api/purchase-requisitions` — listagem paginada, filtro por status. */
export async function listPurchaseRequisitions(params: RequisitionListParams = {}) {
  const { data } = await httpClient.get<ListResponse<PurchaseRequisition>>('/api/purchase-requisitions', { params });
  return data;
}

/** `POST /api/purchase-requisitions` — cria requisição (requester vem do JWT). */
export async function createPurchaseRequisition(input: CreateRequisitionInput) {
  const { data } = await httpClient.post<ItemResponse<PurchaseRequisition>>('/api/purchase-requisitions', input);
  return data.data;
}

/** `PATCH /api/purchase-requisitions/:id/status` — aprovação é admin-only. */
export async function updateRequisitionStatus(id: number, status: 'approved' | 'canceled' | 'pending') {
  const { data } = await httpClient.patch<ItemResponse<PurchaseRequisition>>(
    `/api/purchase-requisitions/${id}/status`,
    { status },
  );
  return data.data;
}

export interface ConvertRequisitionInput {
  fallback_supplier_id?: number;
  notes?: string;
}

/** Pedido de compra gerado a partir da conversão de uma requisição aprovada. */
export interface ConvertedPurchaseOrder {
  id: number;
  order_number: string;
  supplier_id: number;
  status: string;
  items: unknown[];
}

export interface ConvertRequisitionResult {
  purchase_orders: ConvertedPurchaseOrder[];
  requisition_id: number;
  requisition_status: RequisitionStatus;
}

/**
 * `POST /api/purchase-requisitions/:id/convert` — converte requisição aprovada em um ou mais
 * pedidos de compra (agrupados por fornecedor). Erro 422 quando a requisição não está aprovada
 * ou quando há itens sem fornecedor resolvível (a mensagem lista os itens pendentes).
 */
export async function convertRequisitionToPurchaseOrders(id: number, input: ConvertRequisitionInput = {}) {
  const { data } = await httpClient.post<ItemResponse<ConvertRequisitionResult>>(
    `/api/purchase-requisitions/${id}/convert`,
    input,
  );
  return data.data;
}
