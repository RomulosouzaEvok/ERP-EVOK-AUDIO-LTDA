const UseCase = require('../../../../shared/application/UseCase');

/**
 * Gera o relatório de produção de um período, cobrindo
 * `GET /api/production-orders/report`. Wrapper fino sobre
 * `SequelizeProductionOrderRepository.listForReport`, calculando as mesmas
 * métricas (`total_planned`, `total_produced`, `completion_rate`,
 * distribuição `by_status`) do controller legado.
 */
class GetProductionReportUseCase extends UseCase {
  /** @param {import('../../domain/repositories/ProductionOrderRepository')} productionOrderRepository */
  constructor(productionOrderRepository) {
    super();
    this.productionOrderRepository = productionOrderRepository;
  }

  /**
   * @param {Object} input
   * @param {string} [input.start_date]
   * @param {string} [input.end_date]
   * @returns {Promise<{ period: Object, summary: Object, by_status: Object, details: Object[] }>}
   */
  async execute({ start_date, end_date } = {}) {
    const orders = await this.productionOrderRepository.listForReport({ start_date, end_date });

    const totalPlanned = orders.reduce((sum, o) => sum + o.quantity, 0);
    const totalProduced = orders.reduce((sum, o) => sum + (o.quantity_produced || 0), 0);
    const completionRate = totalPlanned > 0 ? (totalProduced / totalPlanned) * 100 : 0;

    const byStatus = { planned: 0, released: 0, in_progress: 0, completed: 0, paused: 0, canceled: 0 };
    orders.forEach(o => { if (byStatus[o.status] !== undefined) byStatus[o.status]++; });

    return {
      period: { start_date, end_date },
      summary: {
        total_orders: orders.length,
        total_planned: totalPlanned,
        total_produced: totalProduced,
        completion_rate: `${completionRate.toFixed(2)}%`
      },
      by_status: byStatus,
      details: orders
    };
  }
}

module.exports = GetProductionReportUseCase;
