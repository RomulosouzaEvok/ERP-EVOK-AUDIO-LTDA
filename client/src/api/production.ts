import { httpClient } from './httpClient';
import type { ItemResponse, ListResponse } from './types';

export type ProductionStatus = 'planned' | 'released' | 'in_progress' | 'paused' | 'completed' | 'canceled';

export interface ProductionOrder {
  id: number;
  order_number?: string;
  product_id: number;
  quantity: string;
  quantity_produced?: string | number;
  status: ProductionStatus;
  priority?: string;
  due_date: string;
  product?: { id: number; name: string; code: string };
}

export interface CreateProductionOrderInput {
  product_id: number;
  quantity: number;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  due_date: string;
  notes?: string;
}

/** `GET /api/production-orders`. */
export async function listProductionOrders(params: { page?: number; limit?: number; status?: ProductionStatus } = {}) {
  const { data } = await httpClient.get<ListResponse<ProductionOrder>>('/api/production-orders', { params });
  return data;
}

/** `POST /api/production-orders`. */
export async function createProductionOrder(input: CreateProductionOrderInput) {
  const { data } = await httpClient.post<ItemResponse<ProductionOrder>>('/api/production-orders', input);
  return data.data;
}

/** `PUT /api/production-orders/:id/status`. */
export async function updateProductionOrderStatus(id: number, status: ProductionStatus) {
  const { data } = await httpClient.put<ItemResponse<ProductionOrder>>(`/api/production-orders/${id}/status`, { status });
  return data.data;
}

export interface LotConsumptionInput {
  product_id: number;
  lot_control_id: number;
  quantity: number;
}

export interface CompleteProductionOrderInput {
  quantity_produced: number;
  lot_consumptions: LotConsumptionInput[];
  finished_lot_number?: string;
}

/**
 * `PUT /api/production-orders/:id/status` com `status: 'completed'` —
 * exige `lot_consumptions` explícitos para rastreabilidade dos insumos
 * (`ChangeProductionOrderStatusUseCase`).
 */
export async function completeProductionOrder(id: number, input: CompleteProductionOrderInput) {
  const { data } = await httpClient.put<ItemResponse<ProductionOrder>>(`/api/production-orders/${id}/status`, {
    status: 'completed',
    ...input,
  });
  return data.data;
}
