import { httpClient } from './httpClient';
import type { ItemResponse, ListResponse } from './types';

/**
 * Módulo Tesouraria (subárea TES do departamento Financeiro, sem linha
 * própria em `departments`). Endpoints hospedados sob `/api/treasury/*`
 * (`server/src/modules/treasury/presentation/routes/treasury.ts`). Cobre 3
 * áreas: Contas Bancárias (CRUD), Operações Financeiras (empréstimos,
 * aplicações, financiamentos, leasing — create/list/get/update em `active`,
 * mais as transições dedicadas `settle`/`cancel`) e Posição de Caixa
 * (relatório derivado, somente leitura). Conciliação bancária OFX/CNAB NÃO
 * está aqui — ver `client/src/api/financial.ts` (se existir integração de
 * conciliação no client) / `server/src/modules/financial/`.
 */

// ---------------------------------------------------------------------------
// Contas Bancárias
// ---------------------------------------------------------------------------

export type BankAccountType = 'corrente' | 'poupanca' | 'aplicacao';

export interface TreasuryBankAccount {
  id: number;
  bank_name: string;
  agency: string;
  account_number: string;
  account_type: BankAccountType;
  current_balance: string | number;
  manager_name: string | null;
  manager_phone: string | null;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ListBankAccountsParams {
  account_type?: BankAccountType;
  active?: boolean;
  page?: number;
  limit?: number;
}

export interface CreateBankAccountInput {
  bank_name: string;
  agency: string;
  account_number: string;
  account_type: BankAccountType;
  current_balance?: number;
  manager_name?: string | null;
  manager_phone?: string | null;
  active?: boolean;
}

export type UpdateBankAccountInput = Partial<CreateBankAccountInput>;

/** `GET /api/treasury/bank-accounts` — listagem paginada, filtros opcionais. */
export async function listBankAccounts(params: ListBankAccountsParams = {}) {
  const { data } = await httpClient.get<ListResponse<TreasuryBankAccount>>('/api/treasury/bank-accounts', { params: { limit: 500, ...params } });
  return data;
}

/** `POST /api/treasury/bank-accounts` — cria uma conta bancária (409 se agência+número duplicados). */
export async function createBankAccount(input: CreateBankAccountInput) {
  const { data } = await httpClient.post<ItemResponse<TreasuryBankAccount>>('/api/treasury/bank-accounts', input);
  return data.data;
}

/** `PUT /api/treasury/bank-accounts/:id` — atualiza campos de uma conta bancária. */
export async function updateBankAccount(id: number, input: UpdateBankAccountInput) {
  const { data } = await httpClient.put<ItemResponse<TreasuryBankAccount>>(`/api/treasury/bank-accounts/${id}`, input);
  return data.data;
}

// ---------------------------------------------------------------------------
// Operações Financeiras
// ---------------------------------------------------------------------------

export type OperationType = 'loan' | 'investment' | 'financing' | 'leasing';
export type GuaranteeType = 'aval' | 'fianca' | 'alienacao' | 'recebiveis' | 'none';
export type OperationStatus = 'active' | 'settled' | 'canceled';

export interface TreasuryFinancialOperation {
  id: number;
  operation_type: OperationType;
  institution: string;
  contract_number: string;
  amount: string | number;
  interest_rate: string | number | null;
  start_date: string;
  end_date: string | null;
  guarantee_type: GuaranteeType;
  status: OperationStatus;
  notes: string | null;
  settled_at: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ListOperationsParams {
  status?: OperationStatus;
  operation_type?: OperationType;
  page?: number;
  limit?: number;
}

export interface CreateOperationInput {
  operation_type: OperationType;
  institution: string;
  contract_number: string;
  amount: number;
  interest_rate?: number | null;
  start_date: string;
  end_date?: string | null;
  guarantee_type?: GuaranteeType;
  notes?: string | null;
}

export type UpdateOperationInput = Partial<CreateOperationInput>;

/** `GET /api/treasury/financial-operations` — listagem paginada, filtros de status/tipo. */
export async function listOperations(params: ListOperationsParams = {}) {
  const { data } = await httpClient.get<ListResponse<TreasuryFinancialOperation>>('/api/treasury/financial-operations', { params: { limit: 500, ...params } });
  return data;
}

/** `GET /api/treasury/financial-operations/:id` — busca por id. */
export async function getOperation(id: number) {
  const { data } = await httpClient.get<ItemResponse<TreasuryFinancialOperation>>(`/api/treasury/financial-operations/${id}`);
  return data.data;
}

/** `POST /api/treasury/financial-operations` — cria uma operação financeira (409 se `contract_number` duplicado). */
export async function createOperation(input: CreateOperationInput) {
  const { data } = await httpClient.post<ItemResponse<TreasuryFinancialOperation>>('/api/treasury/financial-operations', input);
  return data.data;
}

/** `PUT /api/treasury/financial-operations/:id` — atualiza uma operação ainda `active`. */
export async function updateOperation(id: number, input: UpdateOperationInput) {
  const { data } = await httpClient.put<ItemResponse<TreasuryFinancialOperation>>(`/api/treasury/financial-operations/${id}`, input);
  return data.data;
}

/** `PATCH /api/treasury/financial-operations/:id/settle` — liquida a operação (`active -> settled`). */
export async function settleOperation(id: number, settled_at?: string) {
  const { data } = await httpClient.patch<ItemResponse<TreasuryFinancialOperation>>(`/api/treasury/financial-operations/${id}/settle`, settled_at ? { settled_at } : {});
  return data.data;
}

/** `PATCH /api/treasury/financial-operations/:id/cancel` — cancela a operação (`active -> canceled`). */
export async function cancelOperation(id: number) {
  const { data } = await httpClient.patch<ItemResponse<TreasuryFinancialOperation>>(`/api/treasury/financial-operations/${id}/cancel`);
  return data.data;
}

// ---------------------------------------------------------------------------
// Posição de Caixa
// ---------------------------------------------------------------------------

export interface CashPositionBankAccountSummary {
  id: number;
  bank_name: string;
  agency: string;
  account_number: string;
  account_type: BankAccountType;
  current_balance: number;
}

export interface CashPositionReport {
  as_of: string;
  bank_accounts: {
    count: number;
    balance_by_type: Record<string, number>;
    total_balance: number;
    accounts: CashPositionBankAccountSummary[];
  };
  open_titles: {
    total_receivable: number;
    total_payable: number;
    overdue_receivable: number;
    overdue_payable: number;
  };
  projected_balance: number;
}

/** `GET /api/treasury/cash-position` — posição de caixa consolidada. */
export async function getCashPosition() {
  const { data } = await httpClient.get<ItemResponse<CashPositionReport>>('/api/treasury/cash-position');
  return data.data;
}
