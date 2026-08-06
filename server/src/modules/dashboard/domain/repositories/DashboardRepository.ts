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

interface DashboardHandoffsSummary {
  recebimento: { pending: number };
  requisicoes: { awaiting_approval: number };
  expedicao: { ready_to_ship: number };
  qualidade: { quarantine: number; open_rncs: number };
  compras: { pending_returns: number };
}

/** Item resumido de uma demanda em aberto (OP, requisição ou contagem) no painel de TV. */
interface DepartmentDemandItem {
  id: number;
  reference: string;
  status: string;
  due_date: string | null;
  label: string | null;
}

/** Bloco de demandas em aberto de um departamento (ou do grupo "Sem departamento") no painel de TV. */
interface DepartmentDemandGroup {
  department_id: number | null;
  department_name: string;
  open_production_orders: { count: number; items: DepartmentDemandItem[] };
  open_purchase_requisitions: { count: number; items: DepartmentDemandItem[] };
  open_inventory_counts: { count: number; items: DepartmentDemandItem[] };
}

class DashboardRepository {
  /** @returns Indicadores agregados do dashboard. @throws {Error} Se nao implementado. */
  public async getSummary(): Promise<DashboardSummary> {
    throw new Error('DashboardRepository.getSummary não implementado.');
  }

  /**
   * Bloco 3.3 (UC-40, docs/governance/TODO.md) — resumo por área do
   * semáforo de handoff, para o badge/contador do menu lateral.
   *
   * @returns Contadores por área (recebimento, requisições, expedição, qualidade, compras).
   * @throws {Error} Se não implementado.
   */
  public async getHandoffsSummary(): Promise<DashboardHandoffsSummary> {
    throw new Error('DashboardRepository.getHandoffsSummary não implementado.');
  }

  /**
   * Painel de TV (gestores) — demandas em aberto (OPs, requisições de
   * compra e contagens de inventário) agrupadas por departamento, incluindo
   * um grupo agregado `department_id: null` ("Sem departamento") para
   * registros legados sem departamento atribuído.
   *
   * @returns Lista de grupos por departamento (departamentos ativos + "Sem departamento").
   * @throws {Error} Se não implementado.
   */
  public async getDepartmentDemands(): Promise<DepartmentDemandGroup[]> {
    throw new Error('DashboardRepository.getDepartmentDemands não implementado.');
  }
}

export = DashboardRepository;
