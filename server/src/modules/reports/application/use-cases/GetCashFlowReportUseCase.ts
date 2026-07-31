const UseCase = require('../../../../shared/application/UseCase');

/**
 * Calcula o fluxo de caixa agregado (vendas - compras) no período, cobrindo
 * `GET /api/reports/cash-flow`. Mesma limitação já documentada em
 * `docs/CRONOGRAMA_FRONTEND_2026-07-31.md`: agrega totais por período, sem
 * série diária.
 */
class GetCashFlowReportUseCase extends UseCase {
  /** @param {import('../../domain/repositories/ReportsRepository')} reportsRepository */
  constructor(reportsRepository) {
    super();
    this.reportsRepository = reportsRepository;
  }

  /**
   * @param {Object} input - `{ start_date, end_date }`.
   * @returns {Promise<Object>} `{ report_type, generated_at, period, summary }`.
   */
  async execute({ start_date, end_date }) {
    const start = start_date ? new Date(start_date) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = end_date ? new Date(end_date) : new Date();

    const { sales, purchases } = await this.reportsRepository.sumCashFlow(start, end);

    return {
      report_type: 'cash-flow',
      generated_at: new Date(),
      period: { start, end },
      summary: { total_sales: sales, total_purchases: purchases, balance: sales - purchases }
    };
  }
}

module.exports = GetCashFlowReportUseCase;
