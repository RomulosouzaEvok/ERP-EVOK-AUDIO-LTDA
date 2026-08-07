import { httpClient } from './httpClient';
import type { ItemResponse, ListResponse } from './types';

/**
 * Módulo Contabilidade (subárea CONT do departamento Financeiro, sem linha
 * própria em `departments`). Endpoints hospedados sob `/api/accounting/*`
 * (`server/src/modules/accounting/presentation/routes/accounting.ts`).
 * Cobre 3 áreas: Plano de Contas (CRUD sem delete físico), Lançamentos
 * Contábeis em partida dobrada (create/list/get/update — só em rascunho —
 * mais as transições dedicadas `post`/`reverse`) e Balancete (relatório
 * derivado, somente leitura).
 */

// ---------------------------------------------------------------------------
// Plano de Contas
// ---------------------------------------------------------------------------

export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense' | 'cost';

export interface ChartOfAccount {
  id: number;
  code: string;
  name: string;
  account_type: AccountType;
  account_level: number;
  parent_id: number | null;
  accept_entries: boolean;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ListAccountsParams {
  account_type?: AccountType;
  active?: boolean;
  parent_id?: number;
  page?: number;
  limit?: number;
}

export interface CreateAccountInput {
  code: string;
  name: string;
  account_type: AccountType;
  accept_entries?: boolean;
  active?: boolean;
}

export interface UpdateAccountInput {
  name?: string;
  account_type?: AccountType;
  accept_entries?: boolean;
  active?: boolean;
}

/** `GET /api/accounting/accounts` — listagem paginada, filtros opcionais. */
export async function listAccounts(params: ListAccountsParams = {}) {
  const { data } = await httpClient.get<ListResponse<ChartOfAccount>>('/api/accounting/accounts', { params: { limit: 500, ...params } });
  return data;
}

/** `POST /api/accounting/accounts` — cria uma conta do plano (409 se `code` duplicado). */
export async function createAccount(input: CreateAccountInput) {
  const { data } = await httpClient.post<ItemResponse<ChartOfAccount>>('/api/accounting/accounts', input);
  return data.data;
}

/** `PUT /api/accounting/accounts/:id` — atualiza `name`/`account_type`/`accept_entries`/`active`. */
export async function updateAccount(id: number, input: UpdateAccountInput) {
  const { data } = await httpClient.put<ItemResponse<ChartOfAccount>>(`/api/accounting/accounts/${id}`, input);
  return data.data;
}

// ---------------------------------------------------------------------------
// Lançamentos Contábeis
// ---------------------------------------------------------------------------

export type EntryType = 'receipt' | 'payment' | 'sales' | 'purchase' | 'payroll' | 'depreciation' | 'closing' | 'adjustment';
export type EntryStatus = 'draft' | 'posted' | 'reversed';

export interface EntryItem {
  id: number;
  entry_id: number;
  account_id: number;
  cost_center_id: number | null;
  debit: string | number;
  credit: string | number;
  historical: string | null;
  account?: ChartOfAccount;
}

export interface AccountingEntry {
  id: number;
  entry_number: string;
  entry_date: string;
  description: string;
  entry_type: EntryType;
  status: EntryStatus;
  created_by: number;
  approved_by: number | null;
  approved_at: string | null;
  reversal_of_id: number | null;
  items?: EntryItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ListEntriesParams {
  status?: EntryStatus;
  entry_type?: EntryType;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

export interface EntryItemInput {
  account_id: number;
  cost_center_id?: number;
  debit?: number;
  credit?: number;
  historical?: string;
}

export interface CreateEntryInput {
  entry_date: string;
  description: string;
  entry_type: EntryType;
  items: EntryItemInput[];
}

export type UpdateEntryInput = Partial<CreateEntryInput>;

/** `GET /api/accounting/entries` — listagem paginada, filtros de status/tipo/período. */
export async function listEntries(params: ListEntriesParams = {}) {
  const { data } = await httpClient.get<ListResponse<AccountingEntry>>('/api/accounting/entries', { params });
  return data;
}

/** `GET /api/accounting/entries/:id` — busca por id, com itens carregados. */
export async function getEntry(id: number) {
  const { data } = await httpClient.get<ItemResponse<AccountingEntry>>(`/api/accounting/entries/${id}`);
  return data.data;
}

/** `POST /api/accounting/entries` — cria um lançamento (sempre `draft`) com seus itens. */
export async function createEntry(input: CreateEntryInput) {
  const { data } = await httpClient.post<ItemResponse<AccountingEntry>>('/api/accounting/entries', input);
  return data.data;
}

/** `PUT /api/accounting/entries/:id` — atualiza cabeçalho/itens de um lançamento em rascunho. */
export async function updateEntry(id: number, input: UpdateEntryInput) {
  const { data } = await httpClient.put<ItemResponse<AccountingEntry>>(`/api/accounting/entries/${id}`, input);
  return data.data;
}

/** `PATCH /api/accounting/entries/:id/post` — contabiliza o lançamento (`draft -> posted`), valida débito = crédito. */
export async function postEntry(id: number) {
  const { data } = await httpClient.patch<ItemResponse<AccountingEntry>>(`/api/accounting/entries/${id}/post`);
  return data.data;
}

/** `PATCH /api/accounting/entries/:id/reverse` — estorna o lançamento (`posted -> reversed`), gerando um novo lançamento de estorno. */
export async function reverseEntry(id: number) {
  const { data } = await httpClient.patch<ItemResponse<{ original: AccountingEntry; reversal_entry: AccountingEntry }>>(`/api/accounting/entries/${id}/reverse`);
  return data.data;
}

// ---------------------------------------------------------------------------
// Balancete
// ---------------------------------------------------------------------------

export interface TrialBalanceAccountRow {
  account_id: number;
  code: string;
  name: string;
  account_type: AccountType;
  previous_balance: number;
  debit_movement: number;
  credit_movement: number;
  current_balance: number;
}

export interface TrialBalanceReport {
  period: { year: number; month: number };
  accounts: TrialBalanceAccountRow[];
  totals: { previous_balance: number; debit_movement: number; credit_movement: number; current_balance: number };
}

/** `GET /api/accounting/trial-balance?year=&month=` — balancete do mês/ano informado, por conta. */
export async function getTrialBalance(year: number, month: number) {
  const { data } = await httpClient.get<ItemResponse<TrialBalanceReport>>('/api/accounting/trial-balance', { params: { year, month } });
  return data.data;
}
