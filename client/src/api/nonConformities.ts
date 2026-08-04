import { httpClient } from './httpClient';
import type { ItemResponse, ListResponse } from './types';
import type { HandoffSignal } from '@/components/HandoffDot';

/** Ver `server/src/models/NonConformity.ts` para o contrato completo do model. */
export type NonConformityOrigin = 'incoming' | 'in_process' | 'final' | 'audit' | 'customer_complaint' | 'supplier';
export type NonConformityDefectType =
  | 'dimensional'
  | 'visual'
  | 'electrical'
  | 'acoustic'
  | 'material'
  | 'packaging'
  | 'other';
export type NonConformitySeverity = 'critical' | 'major' | 'minor';
export type NonConformityImmediateAction = 'rework' | 'scrap' | 'return_supplier' | 'use_as_is' | 'sorting' | 'other';
export type NonConformityStatus = 'open' | 'analysis' | 'corrective_action' | 'effectiveness_check' | 'closed' | 'canceled';

export interface NonConformity {
  id: number;
  nc_number: string;
  origin: NonConformityOrigin;
  product_id: number | null;
  production_order_id: number | null;
  supplier_id: number | null;
  description: string;
  defect_type: NonConformityDefectType;
  severity: NonConformitySeverity;
  quantity_affected: number;
  immediate_action: NonConformityImmediateAction;
  immediate_action_desc: string | null;
  status: NonConformityStatus;
  lot_number: string | null;
  report_date: string;
  reported_by: number;
  createdAt: string;
  product?: { id: number; name: string; code: string };
  reporter?: { id: number; name: string };
  /**
   * Semáforo de handoff (UC-40, Bloco 3) — fila de tratativa de RNC.
   * `open`/`analysis` = amarelo; `closed` com `effectiveness_result !=
   * 'effective'` = vermelho (reincidente). Calculado on-the-fly, nunca
   * persistido.
   */
  handoff_signal?: HandoffSignal;
}

export interface NonConformityListParams {
  page?: number;
  limit?: number;
  status?: NonConformityStatus;
  severity?: NonConformitySeverity;
}

/**
 * Payload de criação. O `nc_number` é gerado pelo backend
 * (`CreateNonConformityUseCase`, padrão `NC-<timestamp>`), portanto não é
 * enviado pelo client.
 */
export interface NonConformityInput {
  origin: NonConformityOrigin;
  defect_type: NonConformityDefectType;
  severity: NonConformitySeverity;
  description: string;
  immediate_action?: NonConformityImmediateAction;
  immediate_action_desc?: string;
  product_id?: number;
  supplier_id?: number;
  production_order_id?: number;
  quantity_affected?: number;
  lot_number?: string;
}

/** `GET /api/quality/non-conformities` — lista RNCs com filtros e paginação. */
export async function listNonConformities(params: NonConformityListParams = {}) {
  const { data } = await httpClient.get<ListResponse<NonConformity>>('/api/quality/non-conformities', { params });
  return data;
}

/** `GET /api/quality/non-conformities/:id`. */
export async function getNonConformity(id: number) {
  const { data } = await httpClient.get<ItemResponse<NonConformity>>(`/api/quality/non-conformities/${id}`);
  return data.data;
}

/**
 * `POST /api/quality/non-conformities` — registra uma nova RNC. Quando
 * `product_id` + `lot_number` referenciarem um lote existente, o backend
 * bloqueia automaticamente esse lote na mesma transação.
 */
export async function createNonConformity(input: NonConformityInput) {
  const { data } = await httpClient.post<ItemResponse<NonConformity>>('/api/quality/non-conformities', input);
  return data.data;
}
