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
