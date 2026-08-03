import { httpClient } from './httpClient';
import type { ItemResponse } from './types';

export type ProductionTrackingStatus = 'pending' | 'in_progress' | 'paused' | 'completed' | 'skipped';

export interface ProductionRouteStepSummary {
  id: number;
  sequence: number;
  step_code?: string;
  name: string;
  work_center?: string | null;
}

export interface ProductionTrackingOperator {
  id: number;
  name: string;
}

export interface ProductionOrderTracking {
  id: number;
  production_order_id: number;
  sequence: number;
  status: ProductionTrackingStatus;
  started_at: string | null;
  finished_at: string | null;
  quantity_good: string | number | null;
  quantity_scrapped: string | number | null;
  notes: string | null;
  routeStep: ProductionRouteStepSummary | null;
  operator: ProductionTrackingOperator | null;
}

export interface CreateTrackingInput {
  sequence: number;
  production_route_step_id?: number;
  notes?: string;
}

export interface StartTrackingInput {
  operator_id?: number;
}

export interface CompleteTrackingInput {
  quantity_good: number;
  quantity_scrapped: number;
  notes?: string;
}

/** `GET /api/production-orders/:id/tracking`. */
export async function listProductionTracking(productionOrderId: number) {
  const { data } = await httpClient.get<ItemResponse<ProductionOrderTracking[]>>(
    `/api/production-orders/${productionOrderId}/tracking`,
  );
  return data.data;
}

/** `POST /api/production-orders/:id/tracking` — cria etapa `pending`. */
export async function createProductionTracking(productionOrderId: number, input: CreateTrackingInput) {
  const { data } = await httpClient.post<ItemResponse<ProductionOrderTracking>>(
    `/api/production-orders/${productionOrderId}/tracking`,
    input,
  );
  return data.data;
}

/** `POST /api/production-orders/tracking/:trackingId/start`. */
export async function startProductionTracking(trackingId: number, input: StartTrackingInput = {}) {
  const { data } = await httpClient.post<ItemResponse<ProductionOrderTracking>>(
    `/api/production-orders/tracking/${trackingId}/start`,
    input,
  );
  return data.data;
}

/** `POST /api/production-orders/tracking/:trackingId/complete`. */
export async function completeProductionTracking(trackingId: number, input: CompleteTrackingInput) {
  const { data } = await httpClient.post<ItemResponse<ProductionOrderTracking>>(
    `/api/production-orders/tracking/${trackingId}/complete`,
    input,
  );
  return data.data;
}
