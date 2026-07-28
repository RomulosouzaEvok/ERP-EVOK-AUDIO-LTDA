const UseCase = require('../../../../shared/application/UseCase');

/**
 * Lista ordens de produção com paginação e filtros, cobrindo
 * `GET /api/production-orders`. Wrapper fino sobre
 * `SequelizeProductionOrderRepository.list` — inclui o cálculo do `summary`
 * (totais por status e atrasadas) já feito pelo controller legado.
 */
class ListProductionOrdersUseCase extends UseCase {
  /** @param {import('../../domain/repositories/ProductionOrderRepository')} productionOrderRepository */
  constructor(productionOrderRepository) {
    super();
    this.productionOrderRepository = productionOrderRepository;
  }

  /**
   * @param {Object} input
   * @param {number} [input.page=1]
   * @param {number} [input.limit=10]
   * @param {string} [input.status]
   * @param {number} [input.product_id]
   * @param {string} [input.priority]
   * @param {string} [input.start_date]
   * @param {string} [input.end_date]
   * @returns {Promise<{ rows: Object[], count: number, page: number, limit: number, totalPages: number, summary: Object }>}
   */
  async execute({ page = 1, limit = 10, status, product_id, priority, start_date, end_date } = {}) {
    const p = parseInt(page);
    const l = parseInt(limit);
    const offset = (p - 1) * l;

    const { count, rows, totals } = await this.productionOrderRepository.list({
      status, product_id, priority, start_date, end_date, limit: l, offset
    });

    return {
      rows,
      count,
      page: p,
      limit: l,
      totalPages: Math.ceil(count / l),
      summary: { total: totals[0], planned: totals[1], in_progress: totals[2], completed: totals[3], overdue: totals[4] }
    };
  }
}

module.exports = ListProductionOrdersUseCase;
