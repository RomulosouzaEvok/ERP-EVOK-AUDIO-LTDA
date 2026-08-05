import UseCase from '../../../../shared/application/UseCase';
import ReportsRepository = require('../../domain/repositories/ReportsRepository');

/** Filtro de entrada de `GetCashFlowReportUseCase` (query string do endpoint). */
interface GetCashFlowReportInput {
  start_date?: string;
  end_date?: string;
}

/** Saída de `GetCashFlowReportUseCase`. */
interface GetCashFlowReportOutput {
  report_type: 'cash-flow';
  generated_at: Date;
  period: { start: Date; end: Date };
  summary: { total_sales: number; total_purchases: number; balance: number };
}

/**
 * Calcula o fluxo de caixa agregado (vendas - compras) no período, cobrindo
 * `GET /api/reports/cash-flow`. Mesma limitação já documentada em
 * `docs/CRONOGRAMA_FRONTEND_2026-07-31.md`: agrega totais por período, sem
 * série diária.
 */
class GetCashFlowReportUseCase extends UseCase<GetCashFlowReportInput, GetCashFlowReportOutput> {
  private readonly reportsRepository: ReportsRepository;

  /** @param reportsRepository - Repositório de relatórios. */
  constructor(reportsRepository: ReportsRepository) {
    super();
    this.reportsRepository = reportsRepository;
  }

  /**
   * @param input - `{ start_date, end_date }`.
   * @returns `{ report_type, generated_at, period, summary }`.
   */
  async execute({ start_date, end_date }: GetCashFlowReportInput): Promise<GetCashFlowReportOutput> {
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

export = GetCashFlowReportUseCase;
