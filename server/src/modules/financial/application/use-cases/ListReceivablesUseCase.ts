import type { IFinancialRepository } from '../../domain/repositories/FinancialRepository';

const UseCase = require('../../../../shared/application/UseCase');

/** Dados de entrada de `ListReceivablesUseCase.execute`. */
interface ListReceivablesInput {
  status?: string;
  customer_id?: number;
  start_date?: string;
  end_date?: string;
  page: number;
  limit: number;
  offset: number;
}

/**
 * Lista contas a receber com filtros e paginação, cobrindo o fluxo do
 * endpoint `GET /api/finance/receivable`.
 */
class ListReceivablesUseCase extends UseCase {
  financialRepository: IFinancialRepository;

  /**
   * @param {import('../../domain/repositories/FinancialRepository')} financialRepository
   */
  constructor(financialRepository: IFinancialRepository) {
    super();
    this.financialRepository = financialRepository;
  }

  /**
   * @param {Object} input
   * @param {string} [input.status]
   * @param {number} [input.customer_id]
   * @param {string} [input.start_date]
   * @param {string} [input.end_date]
   * @param {number} input.page
   * @param {number} input.limit
   * @param {number} input.offset
   * @returns {Promise<{ rows: Object[], count: number, page: number, limit: number, totalPages: number }>}
   */
  async execute({ status, customer_id, start_date, end_date, page, limit, offset }: ListReceivablesInput) {
    const { rows, count } = await this.financialRepository.listReceivables(
      { status, customer_id, start_date, end_date },
      { limit, offset }
    );
    return { rows, count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

module.exports = ListReceivablesUseCase;


