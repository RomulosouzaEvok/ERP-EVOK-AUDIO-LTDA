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
