import { httpClient } from './httpClient';
import type { ItemResponse } from './types';

export interface ReportsPeriodInput {
  start_date: string;
  end_date: string;
}

export interface ReportsPeriod {
  start_date: string;
  end_date: string;
}

export interface ProductionWipByStatus {
  status: string;
  orders_count: number | string;
  total_quantity: number | string;
}

export interface ProductionAdherence {
  orders_completed: number | string;
  total_planned_quantity: number | string;
  total_produced_quantity: number | string;
  total_scrapped_quantity: number | string;
  adherence_rate: number | string;
  scrap_rate: number | string;
}

export interface ProductionScrapByStep {
  work_center: string | null;
  step_name: string | null;
  sequence: number | string;
  quantity_good: number | string;
  quantity_scrapped: number | string;
  scrap_rate: number | string;
}

export interface ProductionLeadTime {
  avg_days: number | string | null;
  min_days: number | string | null;
  max_days: number | string | null;
}

export interface ProductionReport {
  period: ReportsPeriod;
  wip: ProductionWipByStatus[];
  adherence: ProductionAdherence;
  scrap_by_step: ProductionScrapByStep[];
  lead_time: ProductionLeadTime;
}

export interface PurchasingBySupplier {
  supplier_id: number | string;
  company_name: string;
  orders_count: number | string;
  total_amount: number | string;
  received_orders: number | string;
  avg_lead_time_days: number | string | null;
  on_time_rate: number | string | null;
  rnc_count: number | string;
  last_order_date: string | null;
}

export interface PurchasingTotals {
  orders_count: number | string;
  total_amount: number | string;
  open_orders: number | string;
}

export interface PurchasingReport {
  period: ReportsPeriod;
  by_supplier: PurchasingBySupplier[];
  totals: PurchasingTotals;
}

export async function getProductionReport(period: ReportsPeriodInput) {
  const { data } = await httpClient.get<ItemResponse<ProductionReport>>('/api/reports/production', {
    params: period,
  });
  return data.data;
}

export async function getPurchasingReport(period: ReportsPeriodInput) {
  const { data } = await httpClient.get<ItemResponse<PurchasingReport>>('/api/reports/purchasing', {
    params: period,
  });
  return data.data;
}

export interface CostVarianceByProduct {
  product_id: number | string;
  code: string;
  name: string;
  standard_cost: number | string;
  avg_real_cost: number | string;
  entries_count: number | string;
  total_quantity: number | string;
  variance_abs: number | string;
  variance_rate: number | string;
}

export interface PurchasePriceVarianceByProductSupplier {
  product_id: number | string;
  code: string;
  name: string;
  supplier_id: number | string;
  company_name: string;
  catalog_price: number | string | null;
  avg_paid_price: number | string;
  total_quantity: number | string;
  variance_abs: number | string | null;
  variance_rate: number | string | null;
}

export interface CostVarianceTotals {
  products_with_variance: number | string;
  avg_variance_rate: number | string;
}

export interface CostVarianceReport {
  period: ReportsPeriod;
  by_product: CostVarianceByProduct[];
  purchase_price_variance: PurchasePriceVarianceByProductSupplier[];
  totals: CostVarianceTotals;
}

export async function getCostVarianceReport(period: ReportsPeriodInput) {
  const { data } = await httpClient.get<ItemResponse<CostVarianceReport>>('/api/reports/cost-variance', {
    params: period,
  });
  return data.data;
}

/**
 * Fluxo de caixa agregado (vendas - compras) no período — sem série diária
 * (mesma limitação documentada no backend). Usado na aba "Financeiro" de
 * `ReportsPage` (Bloco E, `relatorios.financeiro`).
 */
export interface CashFlowReport {
  report_type: 'cash-flow';
  generated_at: string;
  period: { start: string; end: string };
  summary: { total_sales: number | string; total_purchases: number | string; balance: number | string };
}

export async function getCashFlowReport(period: ReportsPeriodInput) {
  const { data } = await httpClient.get<ItemResponse<CashFlowReport>>('/api/reports/cash-flow', { params: period });
  return data.data;
}
