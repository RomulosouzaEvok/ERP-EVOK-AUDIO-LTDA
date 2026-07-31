const UseCase = require('../../../../shared/application/UseCase');

/**
 * Gera o relatório de clientes ativos, cobrindo `GET /api/reports/customers`.
 */
class GetCustomersReportUseCase extends UseCase {
  /** @param {import('../../domain/repositories/ReportsRepository')} reportsRepository */
  constructor(reportsRepository) {
    super();
    this.reportsRepository = reportsRepository;
  }

  /** @returns {Promise<Object>} `{ report_type, generated_at, summary, details }`. */
  async execute() {
    const clients = await this.reportsRepository.findActiveCustomers();
    return {
      report_type: 'customers',
      generated_at: new Date(),
      summary: { total_customers: clients.length },
      details: clients
    };
  }
}

module.exports = GetCustomersReportUseCase;
