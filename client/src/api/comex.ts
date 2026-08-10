import { httpClient } from './httpClient';
import type { ItemResponse, ListResponse } from './types';

/**
 * Módulo COMEX/Importação (UC-19). Ciclo de vida do processo:
 * `draft -> shipped -> arrived -> customs_cleared -> received | cancelled`
 * (cancelamento permitido em qualquer estado anterior a `received`).
 * Contratos espelham `server/src/modules/comex/presentation/` — ver
 * `docs/governance/HANDOFF_CODEX.md`, seção "UC-19 — Importação/COMEX".
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

interface RegisterImportTrackingBaseInput {
  event_date?: string;
  notes?: string;
}

/**
 * Embarque (`draft → shipped`). **Não aceita campos monetários** — o gate
 * G11-COMEX congela `exchange_rate`/`freight_value`/`insurance_value`/
 * `other_expenses_value` neste evento (o backend responde 422 com
 * `details.rule = 'G11-COMEX'` e `details.frozen_fields`), para que o
 * processo embarcado seja o mesmo que a diretoria aprovou. O tipo é
 * discriminado justamente para a tela não conseguir oferecer esses campos
 * no embarque.
 */
export interface RegisterImportShipmentInput extends RegisterImportTrackingBaseInput {
  event: 'shipped';
}

/** Chegada/desembaraço — continuam aceitando dados monetários (despesas aduaneiras reais só aparecem aqui). */
export interface RegisterImportCustomsEventInput extends RegisterImportTrackingBaseInput {
  event: 'arrived' | 'customs_cleared';
  exchange_rate?: number;
  freight_value?: number;
  insurance_value?: number;
  other_expenses_value?: number;
}

export type RegisterImportTrackingInput = RegisterImportShipmentInput | RegisterImportCustomsEventInput;

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
 * pular etapa ou repetir dá 422). Em `arrived`/`customs_cleared` os campos
 * monetários são opcionais; se informados, recalculam todos os itens do
 * processo.
 *
 * @throws {AxiosError} 422 BUSINESS_RULE_VIOLATION (`details.rule = 'G11-COMEX'`) — no evento `shipped`, quando a aprovação da diretoria ainda não foi registrada (`details.missing_roles`). Nada é gravado: nem o status, nem o recálculo de tributos. Consulte {@link getImportProcessApprovals} antes de oferecer o embarque.
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

// ---------------------------------------------------------------------------
// G11-COMEX — gate de aprovação da diretoria antes do embarque (2026-08-10)
// ---------------------------------------------------------------------------

/** Identificador da regra ecoado em `error.details.rule` / `approvals.rule` (`server/src/modules/comex/domain/constants.ts`). */
export const IMPORT_APPROVAL_RULE = 'G11-COMEX';

/** Papel de alçada exigido por um processo de importação (hoje só `diretor`, sem faixa de valor). */
export type ImportApproverRole = 'diretor';

export interface ImportProcessApproval {
  id: number;
  import_process_id: number;
  approver_user_id: number;
  approver_role: ImportApproverRole;
  approved_at: string;
}

/**
 * Situação da alçada de um processo de importação
 * (`GET /api/comex/import-processes/:id/approvals`).
 *
 * É a **única** fonte de verdade da tela sobre o gate: nunca inferir
 * aprovação a partir de efeito colateral (tentar aprovar, ou tentar embarcar
 * e ler o 422). `can_register_approval` já combina "processo ainda em
 * `draft`" com "ainda falta algum papel".
 */
export interface ImportProcessApprovalStatus {
  rule: string;
  process_status: ImportProcessStatus;
  /** Evento de acompanhamento travado pelo gate (`shipped`). */
  gate_event: ImportTrackingEvent;
  can_register_approval: boolean;
  required_roles: ImportApproverRole[];
  approvals: ImportProcessApproval[];
  missing_roles: ImportApproverRole[];
  approval_complete: boolean;
}

/**
 * `GET /api/comex/import-processes/:id/approvals` — leitura pura, sem efeito
 * colateral. Acessível a quem tem o módulo `comex` **ou** `diretor` (os dois
 * lados precisam enxergar a situação).
 */
export async function getImportProcessApprovals(id: number) {
  const { data } = await httpClient.get<ItemResponse<ImportProcessApprovalStatus>>(
    `/api/comex/import-processes/${id}/approvals`,
  );
  return data.data;
}

/**
 * `POST /api/comex/import-processes/:id/approve` — registra a aprovação da
 * diretoria (G11-COMEX). Sem body: `approver_user_id` vem do JWT e
 * `approver_role` é resolvido pelo RBAC do backend (nada é aceito do
 * cliente). Não embarca o processo — apenas libera o evento `shipped`.
 *
 * Exige o módulo de acesso `diretor` (`role === 'admin'` também satisfaz):
 * um analista de COMEX não consegue aprovar, mesmo com `comex:operate`.
 *
 * @throws {AxiosError} 403 FORBIDDEN — usuário sem o módulo `diretor`.
 * @throws {AxiosError} 422 BUSINESS_RULE_VIOLATION (`details.rule = 'G11-COMEX'`) — processo fora de `draft` (aprovação retroativa não existe) ou papel que já aprovou.
 */
export async function approveImportProcess(id: number) {
  const { data } = await httpClient.post<ItemResponse<ImportProcessApproval>>(
    `/api/comex/import-processes/${id}/approve`,
  );
  return data.data;
}

/** `POST /api/comex/import-processes/:id/cancel` — cancela um processo ainda não recebido. */
export async function cancelImportProcess(id: number, reason: string) {
  const { data } = await httpClient.post<ItemResponse<ImportProcess>>(`/api/comex/import-processes/${id}/cancel`, { reason });
  return data.data;
}
