import { httpClient } from './httpClient';
import type { ItemResponse, ListResponse } from './types';

/**
 * Módulo Controladoria (subárea CTR do departamento Financeiro, sem linha
 * própria em `departments`). Endpoints hospedados sob `/api/budget/*`
 * (`server/src/modules/budget/presentation/routes/budget.ts`). Cobre a
 * única peça genuinamente nova da subárea — Orçamento: Linhas de Orçamento
 * (CRUD, incluindo DELETE físico — planejamento, não histórico transacional
 * imutável) e o relatório Orçado × Realizado (derivado). Custeio industrial
 * (mão-de-obra/overhead) e Centros de Custo NÃO estão aqui — ver
 * `client/src/api/financial.ts` (`listCostCenters`, `getCostCenterReport`).
 */

// ---------------------------------------------------------------------------
// Linhas de Orçamento
// ---------------------------------------------------------------------------

export type BudgetCategory = 'custo_fixo' | 'custo_variavel' | 'investimento' | 'outro';

export interface BudgetLine {
  id: number;
  cost_center_id: number;
  year: number;
  month: number | null;
  category: BudgetCategory;
  planned_amount: string | number;
  notes: string | null;
  costCenter?: { id: number; code: string; name: string };
  createdAt?: string;
  updatedAt?: string;
}

export interface ListBudgetLinesParams {
  year?: number;
  month?: number;
  cost_center_id?: number;
  category?: BudgetCategory;
  page?: number;
  limit?: number;
}

export interface CreateBudgetLineInput {
  cost_center_id: number;
  year: number;
  month?: number | null;
  category?: BudgetCategory;
  planned_amount: number;
  notes?: string | null;
}

export type UpdateBudgetLineInput = Partial<CreateBudgetLineInput>;

/** `GET /api/budget/lines` — listagem paginada, filtros opcionais. */
export async function listBudgetLines(params: ListBudgetLinesParams = {}) {
  const { data } = await httpClient.get<ListResponse<BudgetLine>>('/api/budget/lines', { params: { limit: 500, ...params } });
  return data;
}

/** `POST /api/budget/lines` — cria uma linha de orçamento (409 se `cost_center_id`+`year`+`month`+`category` duplicados). */
export async function createBudgetLine(input: CreateBudgetLineInput) {
  const { data } = await httpClient.post<ItemResponse<BudgetLine>>('/api/budget/lines', input);
  return data.data;
}

/** `PUT /api/budget/lines/:id` — atualiza campos de uma linha de orçamento. */
export async function updateBudgetLine(id: number, input: UpdateBudgetLineInput) {
  const { data } = await httpClient.put<ItemResponse<BudgetLine>>(`/api/budget/lines/${id}`, input);
  return data.data;
}

/** `DELETE /api/budget/lines/:id` — exclui fisicamente a linha (planejamento, não histórico transacional). */
export async function deleteBudgetLine(id: number) {
  await httpClient.delete(`/api/budget/lines/${id}`);
}

// ---------------------------------------------------------------------------
// Orçado × Realizado
// ---------------------------------------------------------------------------

export interface BudgetReportGroup {
  cost_center_id: number | null;
  code: string | null;
  name: string | null;
  planned_amount: number;
  realized_amount: number;
  variance: number;
  variance_percent: number | null;
}

export interface BudgetReport {
  period: { year: number; month: number | null; from: string; to: string };
  groups: BudgetReportGroup[];
  totals: { planned_amount: number; realized_amount: number; variance: number; variance_percent: number | null };
}

export interface GetBudgetReportParams {
  year: number;
  month?: number;
  cost_center_id?: number;
}

/** `GET /api/budget/report?year=&month=&cost_center_id=` — orçado × realizado por centro de custo. */
export async function getBudgetReport(params: GetBudgetReportParams) {
  const { data } = await httpClient.get<ItemResponse<BudgetReport>>('/api/budget/report', { params });
  return data.data;
}
