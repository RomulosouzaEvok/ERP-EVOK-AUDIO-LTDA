const UseCase = require('../../../../shared/application/UseCase');
const { resolveReportPeriod, safeRate } = require('./reportPeriod');

/**
 * Relatório de manufatura (`GET /api/reports/production`): WIP por status,
 * aderência ao plano, refugo por etapa e lead time de OPs concluídas.
 *
 * OEE completo exige centros de trabalho com capacidade/calendário (ainda não
 * modelados); este relatório entrega os indicadores deriváveis dos dados
 * atuais de OP e apontamento.
 */
class GetProductionReportUseCase extends UseCase {
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

    const [wip, aggregates, scrapRows] = await Promise.all([
      this.reportsRepository.findProductionWip(start, end),
      this.reportsRepository.findProductionCompletedAggregates(start, end),
      this.reportsRepository.findScrapByStep(start, end),
    ]);

    const produced = Number(aggregates?.total_produced_quantity ?? 0);
    const planned = Number(aggregates?.total_planned_quantity ?? 0);
    const scrapped = Number(aggregates?.total_scrapped_quantity ?? 0);

    const scrapByStep = (scrapRows || [])
      .map((row) => {
        const good = Number(row.quantity_good ?? 0);
        const scrap = Number(row.quantity_scrapped ?? 0);
        return {
          work_center: row.work_center,
          step_name: row.step_name,
          sequence: Number(row.sequence ?? 0),
          quantity_good: good,
          quantity_scrapped: scrap,
          scrap_rate: safeRate(scrap, good + scrap),
        };
      })
      .sort((a, b) => b.scrap_rate - a.scrap_rate);

    return {
      report_type: 'production',
      generated_at: new Date(),
      period,
      wip: (wip || []).map((row) => ({
        status: row.status,
        orders_count: Number(row.orders_count ?? 0),
        total_quantity: Number(row.total_quantity ?? 0),
      })),
      adherence: {
        orders_completed: Number(aggregates?.orders_completed ?? 0),
        total_planned_quantity: planned,
        total_produced_quantity: produced,
        total_scrapped_quantity: scrapped,
        adherence_rate: safeRate(produced, planned),
        scrap_rate: safeRate(scrapped, produced + scrapped),
      },
      scrap_by_step: scrapByStep,
      lead_time: {
        avg_days: Number(aggregates?.avg_days ?? 0),
        min_days: Number(aggregates?.min_days ?? 0),
        max_days: Number(aggregates?.max_days ?? 0),
      },
    };
  }
}

module.exports = GetProductionReportUseCase;
