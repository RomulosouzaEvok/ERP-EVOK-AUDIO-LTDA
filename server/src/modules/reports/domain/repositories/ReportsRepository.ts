/**
 * Contrato do repositório de Relatórios (leitura/agregação, sem CRUD).
 *
 * @module modules/reports/domain/repositories/ReportsRepository
 */
class ReportsRepository {
  /**
   * @param {Object} filters - `{ start_date, end_date, customer_id }`.
   * @returns {Promise<Object[]>} Vendas não canceladas no período, com cliente.
   * @throws {Error} Se não implementado.
   */
  async findSales(filters) { // eslint-disable-line no-unused-vars
    throw new Error('ReportsRepository.findSales não implementado.');
  }

  /**
   * @returns {Promise<Object[]>} Produtos ativos, com categoria.
   * @throws {Error} Se não implementado.
   */
  async findActiveProducts() {
    throw new Error('ReportsRepository.findActiveProducts não implementado.');
  }

  /**
   * @returns {Promise<Object[]>} Clientes ativos.
   * @throws {Error} Se não implementado.
   */
  async findActiveCustomers() {
    throw new Error('ReportsRepository.findActiveCustomers não implementado.');
  }

  /**
   * @param {Date} start
   * @param {Date} end
   * @returns {Promise<{ sales: number, purchases: number }>} Totais não cancelados no período.
   * @throws {Error} Se não implementado.
   */
  async sumCashFlow(start, end) { // eslint-disable-line no-unused-vars
    throw new Error('ReportsRepository.sumCashFlow não implementado.');
  }

  /** @returns {Promise<Object[]>} WIP por status de OP. */
  async findProductionWip(start, end) { // eslint-disable-line no-unused-vars
    throw new Error('ReportsRepository.findProductionWip não implementado.');
  }

  /** @returns {Promise<Object>} Agregados de OPs concluídas no período. */
  async findProductionCompletedAggregates(start, end) { // eslint-disable-line no-unused-vars
    throw new Error('ReportsRepository.findProductionCompletedAggregates não implementado.');
  }

  /** @returns {Promise<Object[]>} Refugo por etapa de roteiro no período. */
  async findScrapByStep(start, end) { // eslint-disable-line no-unused-vars
    throw new Error('ReportsRepository.findScrapByStep não implementado.');
  }

  /** @returns {Promise<Object[]>} Compras agregadas por fornecedor no período. */
  async findPurchasingBySupplier(start, end) { // eslint-disable-line no-unused-vars
    throw new Error('ReportsRepository.findPurchasingBySupplier não implementado.');
  }

  /** @returns {Promise<Object[]>} Contagem de RNCs por fornecedor no período. */
  async findRncCountBySupplier(start, end) { // eslint-disable-line no-unused-vars
    throw new Error('ReportsRepository.findRncCountBySupplier não implementado.');
  }

  /** @returns {Promise<Object>} Totais de compras do período. */
  async findPurchasingTotals(start, end) { // eslint-disable-line no-unused-vars
    throw new Error('ReportsRepository.findPurchasingTotals não implementado.');
  }

  /**
   * Custo real por produto no período (lançamentos de `product_cost_ledgers`),
   * com custo padrão via `items.custo_padrao` (fallback `products.cost_price`).
   *
   * @returns {Promise<Object[]>} `[{ product_id, code, name, standard_cost, avg_real_cost, entries_count, total_quantity }]`.
   */
  async findCostVarianceByProduct(start, end) { // eslint-disable-line no-unused-vars
    throw new Error('ReportsRepository.findCostVarianceByProduct não implementado.');
  }

  /**
   * Variação entre preço de catálogo (`item_suppliers.unit_price`) e preço
   * médio pago em pedidos de compra não cancelados do período.
   *
   * @returns {Promise<Object[]>} `[{ product_id, code, name, supplier_id, company_name, catalog_price, avg_paid_price, total_quantity }]`.
   */
  async findPurchasePriceVarianceByProductSupplier(start, end) { // eslint-disable-line no-unused-vars
    throw new Error('ReportsRepository.findPurchasePriceVarianceByProductSupplier não implementado.');
  }
}

module.exports = ReportsRepository;
