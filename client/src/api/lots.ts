import { httpClient } from './httpClient';
import type { ItemResponse, ListResponse } from './types';

/** Status possíveis de um lote (`LotControl`), ver `server/src/models/LotControl.ts`. */
export type LotStatus = 'available' | 'reserved' | 'consumed' | 'blocked' | 'expired' | 'quarantine';

export interface Lot {
  id: number;
  product_id: number;
  supplier_id: number | null;
  purchase_id: number | null;
  production_order_id: number | null;
  lot_number: string;
  status: LotStatus;
  quantity_initial: string;
  quantity_available: string;
  manufactured_at: string | null;
  expires_at: string | null;
  received_at: string | null;
  notes: string | null;
  createdAt: string;
  product?: { id: number; name: string; code: string };
  supplier?: { id: number; company_name: string };
}

export interface LotListParams {
  page?: number;
  limit?: number;
  status?: LotStatus;
  product_id?: number;
}

/**
 * `GET /api/inventory/lots` — lista lotes com filtros e paginação, incluindo
 * `product` e `supplier`. Usado pela inspeção de recebimento de qualidade
 * (filtro por `status`, ex.: `quarantine`, `blocked`, `available`).
 */
export async function listLots(params: LotListParams = {}) {
  const { data } = await httpClient.get<ListResponse<Lot>>('/api/inventory/lots', { params });
  return data;
}

/**
 * `POST /api/inventory/lots/:id/release` — libera um lote para consumo
 * (`quarantine|blocked` -> `available`). `notes` é opcional.
 */
export async function releaseLot(id: number, notes?: string) {
  const { data } = await httpClient.post<ItemResponse<Lot>>(`/api/inventory/lots/${id}/release`, { notes });
  return data.data;
}

/**
 * `POST /api/inventory/lots/:id/block` — bloqueia um lote
 * (`quarantine|available` -> `blocked`), com `reason` obrigatório (mínimo 3 caracteres).
 */
export async function blockLot(id: number, reason: string) {
  const { data } = await httpClient.post<ItemResponse<Lot>>(`/api/inventory/lots/${id}/block`, { reason });
  return data.data;
}
