import { httpClient } from './httpClient';
import type { ItemResponse, ListResponse } from './types';

export type AccountStatus = 'pending' | 'partial' | 'paid' | 'overdue' | 'canceled';
export type InvoiceType = 'nfe' | 'nfse';

export interface AccountPayable {
  id: number;
  description: string;
  amount: string;
  amount_paid: string;
  due_date: string;
  status: AccountStatus;
  supplier_id?: number | null;
  invoice_type?: InvoiceType | null;
  cost_center_id?: number | null;
}

export interface AccountReceivable {
  id: number;
  amount: string;
  amount_paid: string;
  due_date: string;
  status: AccountStatus;
  customer_id?: number | null;
  sale_id?: number | null;
  cost_center_id?: number | null;
}

/** `GET /api/finance/payable`. */
export async function listPayables(params: { page?: number; limit?: number; status?: AccountStatus } = {}) {
  const { data } = await httpClient.get<ListResponse<AccountPayable>>('/api/finance/payable', { params });
  return data;
}

/** `GET /api/finance/receivable`. */
export async function listReceivables(params: { page?: number; limit?: number; status?: AccountStatus } = {}) {
  const { data } = await httpClient.get<ListResponse<AccountReceivable>>('/api/finance/receivable', { params });
  return data;
}

export interface CreatePayableInput {
  description: string;
  amount: number;
  due_date: string;
  category?: string;
  supplier_id?: number;
  invoice_type?: InvoiceType;
  notes?: string;
  cost_center_id?: number;
}

/** `POST /api/finance/payable`. */
export async function createPayable(input: CreatePayableInput) {
  const { data } = await httpClient.post<ItemResponse<AccountPayable>>('/api/finance/payable', input);
  return data.data;
}

/** `PUT /api/finance/payable/:id/pay`. */
export async function payPayable(id: number, amount?: number) {
  const { data } = await httpClient.put<ItemResponse<AccountPayable>>(`/api/finance/payable/${id}/pay`, { amount });
  return data.data;
}

/** `PUT /api/finance/receivable/:id/pay`. */
export async function receivePayment(id: number, amount?: number) {
  const { data } = await httpClient.put<ItemResponse<AccountReceivable>>(`/api/finance/receivable/${id}/pay`, { amount });
  return data.data;
}

/** `PUT /api/finance/payable/:id/cost-center` — atribui (ou remove, com `null`) o centro de custo. */
export async function updatePayableCostCenter(id: number, costCenterId: number | null) {
  const { data } = await httpClient.put<ItemResponse<AccountPayable>>(`/api/finance/payable/${id}/cost-center`, {
    cost_center_id: costCenterId,
  });
  return data.data;
}

/** `PUT /api/finance/receivable/:id/cost-center` — atribui (ou remove, com `null`) o centro de custo. */
export async function updateReceivableCostCenter(id: number, costCenterId: number | null) {
  const { data } = await httpClient.put<ItemResponse<AccountReceivable>>(`/api/finance/receivable/${id}/cost-center`, {
    cost_center_id: costCenterId,
  });
  return data.data;
}

// ============================================
// Centros de Custo
// ============================================

export interface CostCenter {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  active: boolean;
}

/** `GET /api/finance/cost-centers`. */
export async function listCostCenters(params: { active?: boolean; page?: number; limit?: number } = {}) {
  const { data } = await httpClient.get<ListResponse<CostCenter>>('/api/finance/cost-centers', { params });
  return data;
}

export interface CreateCostCenterInput {
  code: string;
  name: string;
  description?: string;
}

/** `POST /api/finance/cost-centers`. */
export async function createCostCenter(input: CreateCostCenterInput) {
  const { data } = await httpClient.post<ItemResponse<CostCenter>>('/api/finance/cost-centers', input);
  return data.data;
}

export interface UpdateCostCenterInput {
  code?: string;
  name?: string;
  description?: string;
  active?: boolean;
}

/** `PUT /api/finance/cost-centers/:id`. */
export async function updateCostCenter(id: number, input: UpdateCostCenterInput) {
  const { data } = await httpClient.put<ItemResponse<CostCenter>>(`/api/finance/cost-centers/${id}`, input);
  return data.data;
}

export interface CostCenterReportGroup {
  cost_center_id: number | null;
  code: string | null;
  name: string;
  receivable: { open: number; realized: number };
  payable: { open: number; realized: number };
}

export interface CostCenterReport {
  period: { from: string; to: string };
  groups: CostCenterReportGroup[];
  totals: {
    receivable: { open: number; realized: number };
    payable: { open: number; realized: number };
  };
}

/** `GET /api/finance/cost-centers/report?from=&to=`. */
export async function getCostCenterReport(params: { from: string; to: string }) {
  const { data } = await httpClient.get<ItemResponse<CostCenterReport>>('/api/finance/cost-centers/report', { params });
  return data.data;
}

export interface CashFlowSummary {
  [key: string]: unknown;
}

/** `GET /api/finance/cash-flow`. */
export async function getCashFlow(params: { start_date: string; end_date: string }) {
  const { data } = await httpClient.get<ItemResponse<CashFlowSummary>>('/api/finance/cash-flow', { params });
  return data.data;
}

export interface CashFlowProjectionWeek {
  week_start: string;
  week_end: string;
  receivable: number;
  payable: number;
  net: number;
  cumulative_net: number;
}

export interface CashFlowProjection {
  horizon_days: number;
  totals: {
    receivable: number;
    payable: number;
    net: number;
    overdue_receivable: number;
    overdue_payable: number;
  };
  due_next_7_days: {
    receivable: number;
    payable: number;
  };
  weeks: CashFlowProjectionWeek[];
}

/** `GET /api/finance/cash-flow-projection` — projeção semanal a partir dos títulos em aberto. */
export async function getCashFlowProjection(days: 30 | 60 | 90 = 30) {
  const { data } = await httpClient.get<ItemResponse<CashFlowProjection>>('/api/finance/cash-flow-projection', {
    params: { days },
  });
  return data.data;
}

export interface DailyCashFlowProjectionPoint {
  date: string;
  day_index: number;
  receivable: number;
  payable: number;
  net: number;
  balance: number;
}

export interface DailyCashFlowProjection {
  horizon_days: number;
  opening_balance: number;
  overdue: { receivable: number; payable: number };
  series: DailyCashFlowProjectionPoint[];
  summary: {
    lowest_balance: { date: string; balance: number };
    final_balance: number;
  };
}

/** `GET /api/finance/cashflow/projection` — projeção diária (saldo acumulado dia a dia) no horizonte de 30/60/90 dias. */
export async function getDailyCashFlowProjection(params: { days: 30 | 60 | 90; opening_balance?: number }) {
  const { data } = await httpClient.get<ItemResponse<DailyCashFlowProjection>>('/api/finance/cashflow/projection', {
    params,
  });
  return data.data;
}
