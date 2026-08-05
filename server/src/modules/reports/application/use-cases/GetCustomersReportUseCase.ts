import UseCase from '../../../../shared/application/UseCase';
import ReportsRepository = require('../../domain/repositories/ReportsRepository');

/** Saída de `GetCustomersReportUseCase`. */
interface GetCustomersReportOutput {
  report_type: 'customers';
  generated_at: Date;
  summary: { total_customers: number };
  details: any[];
}

/**
 * Gera o relatório de clientes ativos, cobrindo `GET /api/reports/customers`.
 */
class GetCustomersReportUseCase extends UseCase<void, GetCustomersReportOutput> {
  private readonly reportsRepository: ReportsRepository;

  /** @param reportsRepository - Repositório de relatórios. */
  constructor(reportsRepository: ReportsRepository) {
    super();
    this.reportsRepository = reportsRepository;
  }

  /** @returns `{ report_type, generated_at, summary, details }`. */
  async execute(): Promise<GetCustomersReportOutput> {
    const clients = await this.reportsRepository.findActiveCustomers();
    return {
      report_type: 'customers',
      generated_at: new Date(),
      summary: { total_customers: clients.length },
      details: clients
    };
  }
}

export = GetCustomersReportUseCase;
