import { httpClient } from './httpClient';
import type { ItemResponse, ListResponse } from './types';

/**
 * Cliente do **Plano Mestre de Produção (MPS, gap G17)** —
 * `/api/production/master-plans`.
 *
 * O MPS é a camada de decisão entre a carteira de pedidos e a ordem de
 * produção. Confirmar uma venda **não** gera OP (decisão D-F do dono: existe
 * PCP formal); o sistema consolida a demanda, uma pessoa decide, e a decisão
 * registrada é o que vira OP.
 *
 * @module api/masterProduction
 */

/** Estados do plano. Só plano `firm` gera ordem de produção. */
export type MasterPlanStatus = 'draft' | 'firm' | 'released' | 'canceled';

/** Estados de uma linha do plano. */
export type MasterPlanLineStatus = 'pending' | 'planned' | 'dismissed' | 'released';

/** Uma linha do plano: um produto, sua demanda consolidada e a decisão do planejador. */
export interface MasterPlanLine {
  id: number;
  plan_id: number;
  product_id: number;
  product?: { id: number; code: string; name: string } | null;
  /** Carteira aberta: soma de (quantidade − faturado) das vendas confirmadas. */
  demand_sales_orders: string | number;
  /** `products.min_quantity` — estoque mínimo tratado como demanda. */
  demand_safety_stock: string | number;
  /** Previsão digitada pelo planejador (o ERP não tem entidade de forecast). */
  demand_forecast: string | number;
  gross_requirement: string | number;
  /** Saldo de PLANEJAMENTO: físico − retido em quarentena/bloqueio − reservado. */
  supply_on_hand: string | number;
  /** Retido pela Qualidade, já descontado de `supply_on_hand` (auditoria). */
  supply_withheld: string | number;
  /** Reservado para outra ordem/venda, já descontado (auditoria). */
  supply_reserved: string | number;
  supply_in_production: string | number;
  net_requirement: string | number;
  /** O que o sistema sugere. */
  suggested_quantity: string | number;
  /** O que a pessoa decidiu. A divergência entre as duas é o que a auditoria de PCP procura. */
  planned_quantity: string | number;
  due_date: string;
  status: MasterPlanLineStatus;
  production_order_id: number | null;
  decided_by: number | null;
  decided_at: string | null;
  notes: string | null;
}

/** Contagens consolidadas devolvidas junto do plano. */
export interface MasterPlanSummary {
  total_lines: number;
  pending_lines: number;
  planned_lines: number;
  dismissed_lines: number;
  released_lines: number;
  total_suggested_quantity: string | number;
  total_planned_quantity: string | number;
}

/** Cabeçalho do plano mestre. */
export interface MasterPlan {
  id: number;
  plan_number: string;
  horizon_start: string;
  horizon_end: string;
  status: MasterPlanStatus;
  planner_id: number;
  consolidated_at: string;
  firmed_by: number | null;
  firmed_at: string | null;
  released_by: number | null;
  released_at: string | null;
  canceled_by: number | null;
  canceled_at: string | null;
  cancel_reason: string | null;
  notes: string | null;
  lines?: MasterPlanLine[];
  summary?: MasterPlanSummary;
}

/** Produto com demanda que o MPS **não** planeja (item de compra, não de fabricação). */
export interface SkippedProduct {
  product_id: number;
  code?: string;
  name?: string;
  reason: string;
}

/** Resultado da criação: o plano, suas linhas e o que ficou de fora — visível, não silencioso. */
export interface CreateMasterPlanResult {
  plan: MasterPlan;
  lines: MasterPlanLine[];
  skipped: SkippedProduct[];
}

export interface ForecastDemandInput {
  product_id: number | string;
  quantity: number | string;
}

export interface CreateMasterPlanInput {
  horizon_start: string;
  horizon_end: string;
  notes?: string;
  forecast_demands?: ForecastDemandInput[];
}

export interface DecideLineInput {
  planned_quantity?: number | string;
  due_date?: string;
  notes?: string;
  /** `true` descarta a linha: o planejador decidiu não produzir este produto agora. */
  dismiss?: boolean;
}

/** Resultado da liberação: as OPs criadas a partir das linhas decididas. */
export interface ReleaseMasterPlanResult {
  plan: MasterPlan;
  production_orders: Array<{ id: number; order_number?: string; product_id: number; quantity: string | number }>;
}

/** `GET /api/production/master-plans` — lista os planos, do mais recente ao mais antigo. */
export async function listMasterPlans(params?: { status?: MasterPlanStatus; page?: number; limit?: number }) {
  const { data } = await httpClient.get<ListResponse<MasterPlan>>('/api/production/master-plans', { params });
  return data;
}

/** `GET /api/production/master-plans/:id` — plano com linhas e resumo da decisão. */
export async function getMasterPlan(id: number | string) {
  const { data } = await httpClient.get<ItemResponse<MasterPlan>>(`/api/production/master-plans/${id}`);
  return data.data;
}

/** `POST /api/production/master-plans` — consolida a demanda do horizonte e cria o plano em `draft`. */
export async function createMasterPlan(input: CreateMasterPlanInput) {
  const { data } = await httpClient.post<ItemResponse<CreateMasterPlanResult>>('/api/production/master-plans', input);
  return data.data;
}

/** `PATCH /api/production/master-plans/:id/lines/:lineId` — grava a decisão do planejador na linha. */
export async function decideMasterPlanLine(planId: number | string, lineId: number | string, input: DecideLineInput) {
  const { data } = await httpClient.patch<ItemResponse<MasterPlanLine>>(
    `/api/production/master-plans/${planId}/lines/${lineId}`,
    input,
  );
  return data.data;
}

/** `POST /api/production/master-plans/:id/firm` — congela a decisão (plano vira `firm`). */
export async function firmMasterPlan(id: number | string) {
  const { data } = await httpClient.post<ItemResponse<MasterPlan>>(`/api/production/master-plans/${id}/firm`, {});
  return data.data;
}

/** `POST /api/production/master-plans/:id/release` — gera as Ordens de Produção. Tudo ou nada. */
export async function releaseMasterPlan(id: number | string) {
  const { data } = await httpClient.post<ItemResponse<ReleaseMasterPlanResult>>(
    `/api/production/master-plans/${id}/release`,
    {},
  );
  return data.data;
}

/** `POST /api/production/master-plans/:id/cancel` — cancela o plano (a partir de `draft` ou `firm`). */
export async function cancelMasterPlan(id: number | string, reason?: string) {
  const { data } = await httpClient.post<ItemResponse<MasterPlan>>(`/api/production/master-plans/${id}/cancel`, {
    reason,
  });
  return data.data;
}
