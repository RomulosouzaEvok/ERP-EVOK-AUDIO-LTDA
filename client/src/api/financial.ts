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
export async function payPayable(id: number, amount: number | undefined, operation_id: string) {
  const { data } = await httpClient.put<ItemResponse<AccountPayable>>(`/api/finance/payable/${id}/pay`, { amount, operation_id });
  return data.data;
}

/** `PUT /api/finance/receivable/:id/pay`. */
export async function receivePayment(id: number, amount: number | undefined, operation_id: string) {
  const { data } = await httpClient.put<ItemResponse<AccountReceivable>>(`/api/finance/receivable/${id}/pay`, { amount, operation_id });
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

// ============================================
// Conciliação Bancária v1 (importação OFX)
// ============================================

export type BankStatementEntryStatus = 'pending' | 'matched' | 'ignored';

export interface BankStatement {
  id: number;
  filename: string;
  bank_name: string | null;
  account_number: string | null;
  period_start: string | null;
  period_end: string | null;
  imported_by: number;
  createdAt?: string;
}

export interface BankStatementEntry {
  id: number;
  statement_id: number;
  entry_date: string;
  amount: string;
  description: string | null;
  fitid: string;
  status: BankStatementEntryStatus;
  matched_payable_id: number | null;
  matched_receivable_id: number | null;
  matched_by: number | null;
  matched_at: string | null;
}

export interface ImportStatementResult {
  statement: BankStatement;
  entries_created: number;
  duplicates_skipped: number;
  total_in_file: number;
}

/** `POST /api/finance/reconciliation/statements` — envia o arquivo .ofx (multipart, campo `file`). */
export async function importBankStatement(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  // Content-Type explicitamente indefinido: deixa o navegador computar o
  // boundary do multipart automaticamente (mesmo padrão de `uploadAssetPhoto`).
  const { data } = await httpClient.post<ItemResponse<ImportStatementResult>>('/api/finance/reconciliation/statements', formData, {
    headers: { 'Content-Type': undefined },
  });
  return data.data;
}

/** `GET /api/finance/reconciliation/statements`. */
export async function listBankStatements(params: { page?: number; limit?: number } = {}) {
  const { data } = await httpClient.get<ListResponse<BankStatement>>('/api/finance/reconciliation/statements', { params });
  return data;
}

/** `GET /api/finance/reconciliation/statements/:id/entries?status=`. */
export async function listBankStatementEntries(statementId: number, status?: BankStatementEntryStatus) {
  const { data } = await httpClient.get<ItemResponse<BankStatementEntry[]>>(
    `/api/finance/reconciliation/statements/${statementId}/entries`,
    { params: status ? { status } : undefined },
  );
  return data.data;
}

export interface MatchSuggestionCandidate {
  type: 'payable' | 'receivable';
  id: number;
  description: string | null;
  due_date: string;
  remaining_amount: number;
  date_diff_days: number;
  amount_diff_cents: number;
}

export interface MatchSuggestionGroup {
  entry: BankStatementEntry;
  suggestions: MatchSuggestionCandidate[];
}

/** `GET /api/finance/reconciliation/statements/:id/suggestions`. */
export async function getReconciliationSuggestions(statementId: number) {
  const { data } = await httpClient.get<ItemResponse<MatchSuggestionGroup[]>>(
    `/api/finance/reconciliation/statements/${statementId}/suggestions`,
  );
  return data.data;
}

/** `POST /api/finance/reconciliation/entries/:id/match` — XOR entre `payableId`/`receivableId`. */
export async function matchBankStatementEntry(entryId: number, target: { payableId?: number; receivableId?: number }) {
  const { data } = await httpClient.post<ItemResponse<{ entry: BankStatementEntry }>>(
    `/api/finance/reconciliation/entries/${entryId}/match`,
    { payable_id: target.payableId, receivable_id: target.receivableId },
  );
  return data.data;
}

/** `POST /api/finance/reconciliation/entries/:id/ignore`. */
export async function ignoreBankStatementEntry(entryId: number) {
  const { data } = await httpClient.post<ItemResponse<BankStatementEntry>>(`/api/finance/reconciliation/entries/${entryId}/ignore`);
  return data.data;
}

/** `POST /api/finance/reconciliation/entries/:id/unmatch`. */
export async function unmatchBankStatementEntry(entryId: number) {
  const { data } = await httpClient.post<ItemResponse<BankStatementEntry>>(`/api/finance/reconciliation/entries/${entryId}/unmatch`);
  return data.data;
}
