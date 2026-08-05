import UseCase from '../../../../shared/application/UseCase';
import ReportsRepository = require('../../domain/repositories/ReportsRepository');
import type { SalesReportFilters } from '../../domain/reportTypes';

/** Saída de `GetSalesReportUseCase`. */
interface GetSalesReportOutput {
  report_type: 'sales';
  generated_at: Date;
  filters: SalesReportFilters;
  summary: { total_sales: number; total_amount: number; average_ticket: number };
  details: any[];
}

/**
 * Gera o relatório de vendas do período, cobrindo `GET /api/reports/sales`.
 */
class GetSalesReportUseCase extends UseCase<SalesReportFilters, GetSalesReportOutput> {
  private readonly reportsRepository: ReportsRepository;

  /** @param reportsRepository - Repositório de relatórios. */
  constructor(reportsRepository: ReportsRepository) {
    super();
    this.reportsRepository = reportsRepository;
  }

  /**
   * @param input - `{ start_date, end_date, customer_id }`.
   * @returns `{ report_type, generated_at, filters, summary, details }`.
   */
  async execute({ start_date, end_date, customer_id }: SalesReportFilters): Promise<GetSalesReportOutput> {
    const sales = await this.reportsRepository.findSales({ start_date, end_date, customer_id });
    const totalSales = sales.length;
    const totalAmount = sales.reduce((acc: number, sale: any) => acc + parseFloat(sale.total_amount || 0), 0);

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

export = GetSalesReportUseCase;
