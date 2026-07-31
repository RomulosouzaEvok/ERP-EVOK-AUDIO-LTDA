const UseCase = require('../../../../shared/application/UseCase');

/**
 * Gera o relatório de vendas do período, cobrindo `GET /api/reports/sales`.
 */
class GetSalesReportUseCase extends UseCase {
  /** @param {import('../../domain/repositories/ReportsRepository')} reportsRepository */
  constructor(reportsRepository) {
    super();
    this.reportsRepository = reportsRepository;
  }

  /**
   * @param {Object} input - `{ start_date, end_date, customer_id }`.
   * @returns {Promise<Object>} `{ report_type, generated_at, filters, summary, details }`.
   */
  async execute({ start_date, end_date, customer_id }) {
    const sales = await this.reportsRepository.findSales({ start_date, end_date, customer_id });
    const totalSales = sales.length;
    const totalAmount = sales.reduce((acc, sale) => acc + parseFloat(sale.total_amount || 0), 0);

    return {
      report_type: 'sales',
      generated_at: new Date(),
      filters: { start_date, end_date, customer_id },
      summary: {
        total_sales: totalSales,
        total_amount: totalAmount,
        average_ticket: totalSales > 0 ? totalAmount / totalSales : 0
      },
      details: sales
    };
  }
}

module.exports = GetSalesReportUseCase;
