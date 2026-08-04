import { httpClient } from './httpClient';
import type { ItemResponse } from './types';

/**
 * API do módulo `intelligentAuditor` (Clean Architecture), montado sob
 * `/api/auditor` em `server/app.ts`. Os 4 endpoints exigem `authorize('admin')`
 * no backend (ver `server/src/modules/intelligentAuditor/presentation/routes/intelligentAuditor.ts`)
 * — não há nível de módulo (`AccessModuleKey`) próprio, é restrito à role.
 *
 * Cada endpoint roda queries agregadas "ao vivo" contra o banco (sem
 * paginação, sem período) — o volume de achados tende a ser pequeno
 * (produtos com estoque negativo, compras paradas há 30+ dias, etc.), por
 * isso a tela consome os 4 de uma vez em vez de paginar.
 */

export interface AuditStockNegativeProduct {
  id: number;
  name: string;
  code: string;
  quantity: string | number;
}

export interface AuditStockNoMovementProduct {
  id: number;
  name: string;
  code: string;
  quantity: string | number;
  [key: string]: unknown;
}

export interface AuditStockResult {
  negative_stock: AuditStockNegativeProduct[];
  no_movement: AuditStockNoMovementProduct[];
  summary: {
    total_negative: number;
    total_no_movement: number;
    products_audited: number;
  };
}

/** `GET /api/auditor/stock` — estoque negativo e produtos sem nenhuma movimentação. */
export async function auditStock() {
  const { data } = await httpClient.get<ItemResponse<AuditStockResult>>('/api/auditor/stock');
  return data.data;
}

export interface AuditSalesResult {
  incomplete_receivables: number;
  sales_without_items: number;
}

/** `GET /api/auditor/sales` — vendas confirmadas e vendas sem nenhum item. */
export async function auditSales() {
  const { data } = await httpClient.get<ItemResponse<AuditSalesResult>>('/api/auditor/sales');
  return data.data;
}

export interface AuditPurchaseDetail {
  id: number;
  order_number: string;
  total_amount: string | number;
  createdAt: string;
  status: string;
}

export interface AuditPurchasesResult {
  purchases_stalled: number;
  details: AuditPurchaseDetail[];
}

/** `GET /api/auditor/purchases` — pedidos de compra pending/approved parados há mais de 30 dias. */
export async function auditPurchases() {
  const { data } = await httpClient.get<ItemResponse<AuditPurchasesResult>>('/api/auditor/purchases');
  return data.data;
}

export interface AuditFinancialStatusTotal {
  status: string;
  total: string | number;
}

export interface AuditFinancialResult {
  overdue_receivable: { count: number; total: number };
  overdue_payable: { count: number; total: number };
  receivable_by_status: AuditFinancialStatusTotal[];
  payable_by_status: AuditFinancialStatusTotal[];
}

/** `GET /api/auditor/financial` — contas a receber/pagar vencidas e totais agrupados por status. */
export async function auditFinancial() {
  const { data } = await httpClient.get<ItemResponse<AuditFinancialResult>>('/api/auditor/financial');
  return data.data;
}
