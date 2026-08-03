const UseCase = require('../../../../shared/application/UseCase');
const { resolveReportPeriod, safeRate } = require('./reportPeriod');

/**
 * Relatório de compras por fornecedor (`GET /api/reports/purchasing`):
 * valor, lead time real, pontualidade e RNCs do período.
 */
class GetPurchasingReportUseCase extends UseCase {
  /** @param {import('../../domain/repositories/ReportsRepository')} reportsRepository */
  constructor(reportsRepository) {
    super();
    this.reportsRepository = reportsRepository;
  }

  /**
   * @param {Object} input - `{ start_date?, end_date? }` (YYYY-MM-DD; default últimos 30 dias).
   * @returns {Promise<Object>}
   */
  async execute(input = {}) {
    const { start, end, period } = resolveReportPeriod(input);

    const [bySupplier, rncRows, totals] = await Promise.all([
      this.reportsRepository.findPurchasingBySupplier(start, end),
      this.reportsRepository.findRncCountBySupplier(start, end),
      this.reportsRepository.findPurchasingTotals(start, end),
    ]);

    const rncBySupplier = new Map(
      (rncRows || []).map((row) => [Number(row.supplier_id), Number(row.rnc_count ?? 0)])
    );

    return {
      report_type: 'purchasing',
      generated_at: new Date(),
      period,
      by_supplier: (bySupplier || []).map((row) => ({
        supplier_id: Number(row.supplier_id),
        company_name: row.company_name,
        orders_count: Number(row.orders_count ?? 0),
        total_amount: Number(row.total_amount ?? 0),
        received_orders: Number(row.received_orders ?? 0),
        avg_lead_time_days: row.avg_lead_time_days === null || row.avg_lead_time_days === undefined
          ? null
          : Number(row.avg_lead_time_days),
        on_time_rate: safeRate(Number(row.on_time_orders ?? 0), Number(row.delivered_with_expected ?? 0)),
        rnc_count: rncBySupplier.get(Number(row.supplier_id)) ?? 0,
        last_order_date: row.last_order_date ?? null,
      })),
      totals: {
        orders_count: Number(totals?.orders_count ?? 0),
        total_amount: Number(totals?.total_amount ?? 0),
        open_orders: Number(totals?.open_orders ?? 0),
      },
    };
  }
}

module.exports = GetPurchasingReportUseCase;
