const UseCase = require('../../../../shared/application/UseCase');

/**
 * Lista contas a pagar com filtros e paginação, cobrindo o fluxo do
 * endpoint `GET /api/finance/payable`.
 */
class ListPayablesUseCase extends UseCase {
  /**
   * @param {import('../../domain/repositories/FinancialRepository')} financialRepository
   */
  constructor(financialRepository) {
    super();
    this.financialRepository = financialRepository;
  }

  /**
   * @param {Object} input
   * @param {string} [input.status]
   * @param {string} [input.start_date]
   * @param {string} [input.end_date]
   * @param {number} input.page
   * @param {number} input.limit
   * @param {number} input.offset
   * @returns {Promise<{ rows: Object[], count: number, page: number, limit: number, totalPages: number }>}
   */
  async execute({ status, start_date, end_date, page, limit, offset }) {
    const { rows, count } = await this.financialRepository.listPayables(
      { status, start_date, end_date },
      { limit, offset }
    );
    return { rows, count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

module.exports = ListPayablesUseCase;
