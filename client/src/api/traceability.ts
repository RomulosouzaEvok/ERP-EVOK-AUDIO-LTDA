import { httpClient } from './httpClient';
import type { ItemResponse } from './types';

export interface TraceabilityEvent {
  item_id: number;
  codigo?: string | null;
  descricao?: string | null;
  tipo: string;
  movimento_tipo?: string;
  quantidade: number;
  lote_id?: number | null;
  codigo_lote?: string | null;
  numero_serie?: string | null;
  origem_tabela?: string;
  origem_id?: number | null;
  criado_em?: string | null;
  metadata?: Record<string, unknown>;
}

/** `GET /api/traceability/items/:id`. */
export async function getItemTraceability(id: number) {
  const { data } = await httpClient.get<ItemResponse<TraceabilityEvent[]>>(`/api/traceability/items/${id}`);
  return data.data;
}

/** `GET /api/traceability/lots/:id`. */
export async function getLotTraceability(id: number) {
  const { data } = await httpClient.get<ItemResponse<unknown>>(`/api/traceability/lots/${id}`);
  return data.data;
}

/** `GET /api/traceability/production-orders/:id`. */
export async function getProductionOrderTraceability(id: number) {
  const { data } = await httpClient.get<ItemResponse<unknown>>(`/api/traceability/production-orders/${id}`);
  return data.data;
}
