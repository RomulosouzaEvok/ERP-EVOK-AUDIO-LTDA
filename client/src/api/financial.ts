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
}

export interface AccountReceivable {
  id: number;
  amount: string;
  amount_paid: string;
  due_date: string;
  status: AccountStatus;
  customer_id?: number | null;
  sale_id?: number | null;
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
