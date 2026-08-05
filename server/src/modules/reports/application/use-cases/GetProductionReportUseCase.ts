import UseCase from '../../../../shared/application/UseCase';
import ReportsRepository = require('../../domain/repositories/ReportsRepository');
import type { ProductionWipRow, ProductionCompletedAggregates, ScrapByStepRow } from '../../domain/reportTypes';
import type { ReportPeriodInput, ResolvedReportPeriod } from './reportPeriod';

const { resolveReportPeriod, safeRate } = require('./reportPeriod');

/** Linha de refugo por etapa, já com a taxa calculada. */
interface ScrapByStepWithRate {
  work_center: string;
  step_name: string;
  sequence: number;
  quantity_good: number;
  quantity_scrapped: number;
  scrap_rate: number;
}

/** Saída de `GetProductionReportUseCase`. */
interface GetProductionReportOutput {
  report_type: 'production';
  generated_at: Date;
  period: ResolvedReportPeriod['period'];
  wip: { status: string; orders_count: number; total_quantity: number }[];
  adherence: {
    orders_completed: number;
    total_planned_quantity: number;
    total_produced_quantity: number;
    total_scrapped_quantity: number;
    adherence_rate: number;
    scrap_rate: number;
  };
  scrap_by_step: ScrapByStepWithRate[];
  lead_time: { avg_days: number; min_days: number; max_days: number };
}

/**
 * Relatório de manufatura (`GET /api/reports/production`): WIP por status,
 * aderência ao plano, refugo por etapa e lead time de OPs concluídas.
 *
 * OEE completo exige centros de trabalho com capacidade/calendário (ainda não
 * modelados); este relatório entrega os indicadores deriváveis dos dados
 * atuais de OP e apontamento.
 */
class GetProductionReportUseCase extends UseCase<ReportPeriodInput, GetProductionReportOutput> {
  private readonly reportsRepository: ReportsRepository;

  /** @param reportsRepository - Repositório de relatórios. */
  constructor(reportsRepository: ReportsRepository) {
    super();
    this.reportsRepository = reportsRepository;
  }

  /**
   * @param input - `{ start_date?, end_date? }` (YYYY-MM-DD; default últimos 30 dias).
   * @returns Relatório de manufatura (WIP, aderência, refugo por etapa, lead time).
   */
  async execute(input: ReportPeriodInput = {}): Promise<GetProductionReportOutput> {
    const { start, end, period } = resolveReportPeriod(input);

    const [wip, aggregates, scrapRows]: [ProductionWipRow[], ProductionCompletedAggregates, ScrapByStepRow[]] = await Promise.all([
      this.reportsRepository.findProductionWip(start, end),
      this.reportsRepository.findProductionCompletedAggregates(start, end),
      this.reportsRepository.findScrapByStep(start, end),
    ]);

    const produced = Number(aggregates?.total_produced_quantity ?? 0);
    const planned = Number(aggregates?.total_planned_quantity ?? 0);
    const scrapped = Number(aggregates?.total_scrapped_quantity ?? 0);

    const scrapByStep: ScrapByStepWithRate[] = (scrapRows || [])
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

export = GetProductionReportUseCase;
