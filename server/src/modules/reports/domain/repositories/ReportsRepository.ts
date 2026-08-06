/**
 * Contrato do repositório de Relatórios (leitura/agregação, sem CRUD).
 *
 * @module modules/reports/domain/repositories/ReportsRepository
 */
import type {
  SalesReportFilters,
  CashFlowTotals,
  ProductionWipRow,
  ProductionCompletedAggregates,
  ScrapByStepRow,
  PurchasingBySupplierRow,
  RncCountBySupplierRow,
  PurchasingTotals,
  CostVarianceRow,
  PurchasePriceVarianceRow,
  OeeWorkCenterRow,
  OeeAggregateRow,
} from '../reportTypes';

class ReportsRepository {
  /**
   * @param filters - `{ start_date, end_date, customer_id }`.
   * @returns Vendas não canceladas no período, com cliente (instâncias do model `Sale`).
   * @throws {Error} Se não implementado.
   */
  async findSales(_filters: SalesReportFilters): Promise<any[]> {
    throw new Error('ReportsRepository.findSales não implementado.');
  }

  /**
   * @returns Produtos ativos, com categoria (instâncias do model `Product`).
   * @throws {Error} Se não implementado.
   */
  async findActiveProducts(): Promise<any[]> {
    throw new Error('ReportsRepository.findActiveProducts não implementado.');
  }

  /**
   * @returns Clientes ativos (instâncias do model `Client`).
   * @throws {Error} Se não implementado.
   */
  async findActiveCustomers(): Promise<any[]> {
    throw new Error('ReportsRepository.findActiveCustomers não implementado.');
  }

  /**
   * @param _start - Início do período.
   * @param _end - Fim do período.
   * @returns Totais não cancelados no período.
   * @throws {Error} Se não implementado.
   */
  async sumCashFlow(_start: Date, _end: Date): Promise<CashFlowTotals> {
    throw new Error('ReportsRepository.sumCashFlow não implementado.');
  }

  /** @returns WIP por status de OP. */
  async findProductionWip(_start: Date, _end: Date): Promise<ProductionWipRow[]> {
    throw new Error('ReportsRepository.findProductionWip não implementado.');
  }

  /** @returns Agregados de OPs concluídas no período. */
  async findProductionCompletedAggregates(_start: Date, _end: Date): Promise<ProductionCompletedAggregates> {
    throw new Error('ReportsRepository.findProductionCompletedAggregates não implementado.');
  }

  /** @returns Refugo por etapa de roteiro no período. */
  async findScrapByStep(_start: Date, _end: Date): Promise<ScrapByStepRow[]> {
    throw new Error('ReportsRepository.findScrapByStep não implementado.');
  }

  /** @returns Compras agregadas por fornecedor no período. */
  async findPurchasingBySupplier(_start: Date, _end: Date): Promise<PurchasingBySupplierRow[]> {
    throw new Error('ReportsRepository.findPurchasingBySupplier não implementado.');
  }

  /** @returns Contagem de RNCs por fornecedor no período. */
  async findRncCountBySupplier(_start: Date, _end: Date): Promise<RncCountBySupplierRow[]> {
    throw new Error('ReportsRepository.findRncCountBySupplier não implementado.');
  }

  /** @returns Totais de compras do período. */
  async findPurchasingTotals(_start: Date, _end: Date): Promise<PurchasingTotals> {
    throw new Error('ReportsRepository.findPurchasingTotals não implementado.');
  }

  /**
   * Custo real por produto no período (lançamentos de `product_cost_ledgers`),
   * com custo padrão via `items.custo_padrao` (fallback `products.cost_price`).
   *
   * @returns Linhas de variação de custo por produto.
   */
  async findCostVarianceByProduct(_start: Date, _end: Date): Promise<CostVarianceRow[]> {
    throw new Error('ReportsRepository.findCostVarianceByProduct não implementado.');
  }

  /**
   * Variação entre preço de catálogo (`item_suppliers.unit_price`) e preço
   * médio pago em pedidos de compra não cancelados do período.
   *
   * @returns Linhas de variação de preço por produto x fornecedor.
   */
  async findPurchasePriceVarianceByProductSupplier(_start: Date, _end: Date): Promise<PurchasePriceVarianceRow[]> {
    throw new Error('ReportsRepository.findPurchasePriceVarianceByProductSupplier não implementado.');
  }

  /**
   * Centros de trabalho ativos com turnos (`WorkCenter` + `shifts`), base
   * para o cálculo de horas disponíveis do relatório de OEE.
   *
   * @param _workCenterId - Filtra um único centro, quando informado.
   * @returns Instâncias de `WorkCenter` (com `shifts` incluído).
   */
  async findWorkCentersForOee(_workCenterId?: number): Promise<OeeWorkCenterRow[]> {
    throw new Error('ReportsRepository.findWorkCentersForOee não implementado.');
  }

  /**
   * Apontamentos concluídos no período, agregados por centro de trabalho,
   * base de cálculo dos eixos de performance e qualidade do OEE.
   *
   * @param _start - Início do período.
   * @param _end - Fim do período.
   * @param _workCenterId - Filtra um único centro, quando informado.
   * @returns Linhas agregadas por `work_center_id`.
   */
  async findOeeAggregatesByWorkCenter(_start: Date, _end: Date, _workCenterId?: number): Promise<OeeAggregateRow[]> {
    throw new Error('ReportsRepository.findOeeAggregatesByWorkCenter não implementado.');
  }
}

export = ReportsRepository;
