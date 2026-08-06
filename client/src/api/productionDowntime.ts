import { httpClient } from './httpClient';
import type { ItemResponse, ListResponse } from './types';

export type ProductionDowntimeReason =
  | 'setup'
  | 'manutencao_corretiva'
  | 'manutencao_preventiva'
  | 'falta_material'
  | 'falta_operador'
  | 'qualidade'
  | 'outros';

export const DOWNTIME_REASON_LABEL: Record<ProductionDowntimeReason, string> = {
  setup: 'Setup',
  manutencao_corretiva: 'Manutenção corretiva',
  manutencao_preventiva: 'Manutenção preventiva',
  falta_material: 'Falta de material',
  falta_operador: 'Falta de operador',
  qualidade: 'Qualidade',
  outros: 'Outros',
};

export interface ProductionDowntime {
  id: number;
  work_center_id: number;
  production_order_id: number | null;
  reason: ProductionDowntimeReason;
  notes: string | null;
  started_at: string;
  finished_at: string | null;
  created_by: number;
  workCenter?: { id: number; code: string; name: string } | null;
  productionOrder?: { id: number; order_number: string } | null;
  createdBy?: { id: number; name: string } | null;
}

export interface ListProductionDowntimesParams {
  work_center_id?: number | string;
  from?: string;
  to?: string;
  open?: boolean;
  page?: number;
  limit?: number;
}

export interface OpenProductionDowntimeInput {
  work_center_id: number;
  production_order_id?: number | null;
  reason: ProductionDowntimeReason;
  notes?: string;
  started_at?: string;
}

export interface FinishProductionDowntimeInput {
  finished_at?: string;
}

/** `GET /api/production/downtimes`. */
export async function listProductionDowntimes(params: ListProductionDowntimesParams = {}) {
  const { data } = await httpClient.get<ListResponse<ProductionDowntime>>('/api/production/downtimes', { params });
  return data;
}

/** `POST /api/production/downtimes` — abre uma parada. */
export async function openProductionDowntime(input: OpenProductionDowntimeInput) {
  const { data } = await httpClient.post<ItemResponse<ProductionDowntime>>('/api/production/downtimes', input);
  return data.data;
}

/** `PUT /api/production/downtimes/:id/finish` — encerra uma parada aberta. */
export async function finishProductionDowntime(id: number, input: FinishProductionDowntimeInput = {}) {
  const { data } = await httpClient.put<ItemResponse<ProductionDowntime>>(`/api/production/downtimes/${id}/finish`, input);
  return data.data;
}
