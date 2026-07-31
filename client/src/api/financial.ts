import { httpClient } from './httpClient';
import type { ItemResponse, ListResponse } from './types';

export type AccountStatus = 'pending' | 'paid' | 'overdue' | 'canceled';

export interface AccountPayable {
  id: number;
  description: string;
  amount: string;
  due_date: string;
  status: AccountStatus;
  supplier_id?: number | null;
}

export interface AccountReceivable {
  id: number;
  amount: string;
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
