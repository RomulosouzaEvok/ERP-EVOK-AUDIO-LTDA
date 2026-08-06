/**
 * Tipos compartilhados do módulo `reports` (filtros de entrada e shapes das
 * linhas agregadas retornadas pelas queries de `ReportsRepository`). Mantidos
 * num arquivo único para reaproveitar entre a interface do repositório
 * (`ReportsRepository`), a implementação Sequelize/SQL raw
 * (`SequelizeReportsRepository`) e os use cases/controller que consomem os
 * dados agregados.
 *
 * @module modules/reports/domain/reportTypes
 */

/** Filtro de `GET /api/reports/sales` (também usado por `findSales`). */
export interface SalesReportFilters {
  start_date?: string;
  end_date?: string;
  customer_id?: string | number;
}

/** Totais não cancelados de vendas/compras num período (`sumCashFlow`). */
export interface CashFlowTotals {
  sales: number;
  purchases: number;
}

/** Uma linha de WIP de produção agrupada por status (`findProductionWip`). */
export interface ProductionWipRow {
  status: string;
  orders_count: number;
  total_quantity: number;
}

/** Agregados de OPs concluídas no período (`findProductionCompletedAggregates`). */
export interface ProductionCompletedAggregates {
  orders_completed: number;
  total_planned_quantity: number;
  total_produced_quantity: number;
  total_scrapped_quantity: number;
  avg_days: number;
  min_days: number;
  max_days: number;
}

/** Refugo por etapa de roteiro no período (`findScrapByStep`). */
export interface ScrapByStepRow {
  work_center: string;
  step_name: string;
  sequence: number | null;
  quantity_good: number;
  quantity_scrapped: number;
}

/** Compras agregadas por fornecedor no período (`findPurchasingBySupplier`). */
export interface PurchasingBySupplierRow {
  supplier_id: number;
  company_name: string;
  orders_count: number;
  total_amount: number;
  received_orders: number;
  avg_lead_time_days: number | null;
  on_time_orders: number;
  delivered_with_expected: number;
  last_order_date: string | null;
}

/** Contagem de RNCs por fornecedor no período (`findRncCountBySupplier`). */
export interface RncCountBySupplierRow {
  supplier_id: number;
  rnc_count: number;
}

/** Totais de compras do período (`findPurchasingTotals`). */
export interface PurchasingTotals {
  orders_count: number;
  total_amount: number;
  open_orders: number;
}

/** Variação de custo real x padrão por produto (`findCostVarianceByProduct`). */
export interface CostVarianceRow {
  product_id: number;
  code: string;
  name: string;
  standard_cost: number;
  entries_count: number;
  total_quantity: number;
  avg_real_cost: number;
}

/** Variação de preço de compra por produto x fornecedor (`findPurchasePriceVarianceByProductSupplier`). */
export interface PurchasePriceVarianceRow {
  product_id: number;
  code: string;
  name: string;
  supplier_id: number;
  company_name: string;
  catalog_price: number | null;
  total_quantity: number;
  avg_paid_price: number;
}

/**
 * Turno cadastrado de um centro de trabalho (associação `WorkCenter.shifts`),
 * usado para calcular horas disponíveis do OEE (`findWorkCentersForOee`).
 */
export interface OeeWorkCenterShift {
  weekday: number;
  start_time: string;
  end_time: string;
}

/**
 * Centro de trabalho ativo (instância Sequelize de `WorkCenter`, com
 * `shifts` incluído) retornado por `findWorkCentersForOee`. Documentado aqui
 * apenas o shape mínimo consumido pelo use case do OEE.
 */
export interface OeeWorkCenterRow {
  id: number;
  code: string;
  name: string;
  machines_count: number;
  capacity_hours_per_day: number;
  efficiency_factor: number;
  shifts: OeeWorkCenterShift[];
}

/**
 * Apontamentos concluídos (`production_order_tracking.status = 'completed'`)
 * agregados por centro de trabalho no período, base de cálculo do OEE
 * (`findOeeAggregatesByWorkCenter`).
 *
 * - `run_hours`: soma de `finished_at - started_at` (tempo real apontado).
 * - `standard_hours`: soma de `(quantity_good + quantity_scrapped) *
 *   standard_time_minutes / 60` (tempo padrão para as unidades processadas,
 *   sem `setup_time_minutes` — ver `GetOeeReportUseCase` para a limitação).
 * - `quantity_good` / `quantity_scrapped`: somas usadas no eixo de qualidade.
 */
export interface OeeAggregateRow {
  work_center_id: number;
  run_hours: number;
  standard_hours: number;
  quantity_good: number;
  quantity_scrapped: number;
  tracking_count: number;
}
