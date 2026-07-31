/**
 * Contrato do repositorio de indicadores do Dashboard.
 *
 * @module modules/dashboard/domain/repositories/DashboardRepository
 */

interface DashboardSummary {
  products: { total: number; low_stock: number };
  sales: { month_total: number; month_count: number };
  purchases: { pending_total: number };
  clients: { total: number };
  production: { open_orders: number };
  financial: { pending_receivable: number; pending_payable: number; projected_balance: number };
}

class DashboardRepository {
  /** @returns Indicadores agregados do dashboard. @throws {Error} Se nao implementado. */
  public async getSummary(): Promise<DashboardSummary> {
    throw new Error('DashboardRepository.getSummary não implementado.');
  }
}

export = DashboardRepository;
