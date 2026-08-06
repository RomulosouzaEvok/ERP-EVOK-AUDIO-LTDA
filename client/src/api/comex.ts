import { httpClient } from './httpClient';
import type { ItemResponse, ListResponse } from './types';

/**
 * Módulo COMEX/Importação (UC-19). Ciclo de vida do processo:
 * `draft -> shipped -> arrived -> customs_cleared -> received | cancelled`
 * (cancelamento permitido em qualquer estado anterior a `received`).
 * Contratos espelham `server/src/modules/comex/presentation/` — ver
 * `docs/HANDOFF_CODEX.md`, seção "UC-19 — Importação/COMEX".
 */
export type ImportProcessStatus = 'draft' | 'shipped' | 'arrived' | 'customs_cleared' | 'received' | 'cancelled';

export type ImportTrackingEvent = 'shipped' | 'arrived' | 'customs_cleared';

/**
 * Item de um processo de importação. Valores de tributo/custo nacionalizado
 * ficam `null` até a primeira criação/recálculo (backend recalcula a cada
 * `POST /tracking` com valores monetários e novamente no `POST /receive`).
 */
export interface ImportProcessItem {
  id: number;
  import_process_id: number;
  item_id: string;
  quantity: string | number;
  fob_unit_price: string | number;
  ii_rate: string | number;
  ipi_rate: string | number;
  pis_rate: string | number;
  cofins_rate: string | number;
  icms_rate: string | number;
  customs_value: string | number | null;
  ii_value: string | number | null;
  ipi_value: string | number | null;
  pis_value: string | number | null;
  cofins_value: string | number | null;
  icms_value: string | number | null;
  nationalized_unit_cost: string | number | null;
  item?: { id: string; codigo: string; descricao: string; unidade?: string };
}

/** Cabeçalho de um processo de importação (UC-19). */
export interface ImportProcess {
  id: number;
  process_number: string;
  supplier_id: number;
  supplier?: { id: number; company_name: string; trade_name: string | null; cnpj?: string | null };
  status: ImportProcessStatus;
  fob_currency: string;
  exchange_rate: string | number;
  freight_value: string | number;
  insurance_value: string | number;
  other_expenses_value: string | number;
  shipped_at: string | null;
  arrived_at: string | null;
  customs_cleared_at: string | null;
  received_at: string | null;
  notes: string | null;
  created_by: number;
  createdBy?: { id: number; name: string; email: string };
  items: ImportProcessItem[];
  createdAt?: string;
}

export interface CreateImportProcessItemInput {
  item_id: string;
  quantity: number;
  fob_unit_price: number;
  ii_rate?: number;
  ipi_rate?: number;
  pis_rate?: number;
  cofins_rate?: number;
  icms_rate?: number;
}

export interface CreateImportProcessInput {
  supplier_id: number;
  fob_currency?: string;
  exchange_rate?: number;
  freight_value?: number;
  insurance_value?: number;
  other_expenses_value?: number;
  notes?: string;
  items: CreateImportProcessItemInput[];
}

export interface ImportProcessListParams {
  page?: number;
  limit?: number;
  status?: ImportProcessStatus;
  supplier_id?: number;
}

export interface RegisterImportTrackingInput {
  event: ImportTrackingEvent;
  event_date?: string;
  exchange_rate?: number;
  freight_value?: number;
  insurance_value?: number;
  other_expenses_value?: number;
  notes?: string;
}

/** `GET /api/comex/import-processes` — listagem paginada, filtro por status/fornecedor. */
export async function listImportProcesses(params: ImportProcessListParams = {}) {
  const { data } = await httpClient.get<ListResponse<ImportProcess>>('/api/comex/import-processes', { params });
  return data;
}

/** `GET /api/comex/import-processes/:id` — detalhe completo com itens/tributos calculados. */
export async function getImportProcessById(id: number) {
  const { data } = await httpClient.get<ItemResponse<ImportProcess>>(`/api/comex/import-processes/${id}`);
  return data.data;
}

/** `POST /api/comex/import-processes` — cria o processo (nasce em `draft`, tributos calculados na hora). */
export async function createImportProcess(input: CreateImportProcessInput) {
  const { data } = await httpClient.post<ItemResponse<ImportProcess>>('/api/comex/import-processes', input);
  return data.data;
}

/**
 * `POST /api/comex/import-processes/:id/tracking` — registra o próximo marco
 * do acompanhamento (`shipped -> arrived -> customs_cleared`, sequencial:
 * pular etapa ou repetir dá 422). Campos monetários são opcionais; se
 * informados, recalculam todos os itens do processo.
 */
export async function registerImportTracking(id: number, input: RegisterImportTrackingInput) {
  const { data } = await httpClient.post<ItemResponse<ImportProcess>>(`/api/comex/import-processes/${id}/tracking`, input);
  return data.data;
}

/**
 * `POST /api/comex/import-processes/:id/receive` — nacionaliza e dá entrada
 * em estoque com custo nacionalizado (exige status `customs_cleared`; exige
 * `Product` legado correspondente a cada item).
 */
export async function receiveImportProcess(id: number) {
  const { data } = await httpClient.post<ItemResponse<ImportProcess>>(`/api/comex/import-processes/${id}/receive`, {});
  return data.data;
}

/** `POST /api/comex/import-processes/:id/cancel` — cancela um processo ainda não recebido. */
export async function cancelImportProcess(id: number, reason: string) {
  const { data } = await httpClient.post<ItemResponse<ImportProcess>>(`/api/comex/import-processes/${id}/cancel`, { reason });
  return data.data;
}
