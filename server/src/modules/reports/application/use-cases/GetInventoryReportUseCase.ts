const UseCase = require('../../../../shared/application/UseCase');

/**
 * Gera o relatório consolidado de estoque, cobrindo `GET /api/reports/inventory`.
 */
class GetInventoryReportUseCase extends UseCase {
  /** @param {import('../../domain/repositories/ReportsRepository')} reportsRepository */
  constructor(reportsRepository) {
    super();
    this.reportsRepository = reportsRepository;
  }

  /** @returns {Promise<Object>} `{ report_type, generated_at, summary, details }`. */
  async execute() {
    const products = await this.reportsRepository.findActiveProducts();
    const totalItems = products.reduce((acc, product) => acc + Number(product.quantity), 0);
    const totalValue = products.reduce(
      (acc, product) => acc + parseFloat(product.cost_price || 0) * Number(product.quantity),
      0
    );

    return {
      report_type: 'inventory',
      generated_at: new Date(),
      summary: { total_products: products.length, total_items: totalItems, total_value: totalValue },
      details: products
    };
  }
}

module.exports = GetInventoryReportUseCase;
