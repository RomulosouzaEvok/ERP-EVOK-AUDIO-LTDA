import type SuppliersRepository = require('../../domain/repositories/SuppliersRepository');

const UseCase = require('../../../../shared/application/UseCase');
const Validators = require('../../../../utils/validators');

interface ListSuppliersInput {
  search?: string;
  status?: string;
  page: number;
  limit: number;
}

/**
 * Lista fornecedores com busca/filtro e paginação, cobrindo o fluxo do
 * endpoint `GET /api/suppliers`.
 */
class ListSuppliersUseCase extends UseCase {
  private suppliersRepository: SuppliersRepository;

  /**
   * @param {import('../../domain/repositories/SuppliersRepository')} suppliersRepository
   */
  constructor(suppliersRepository: SuppliersRepository) {
    super();
    this.suppliersRepository = suppliersRepository;
  }

  /**
   * @param {Object} input
   * @param {string} [input.search] - Termo de busca por `company_name`/`cnpj` (sanitizado via `Validators.sanitizeSearch`).
   * @param {string} [input.status]
   * @param {number} input.page
   * @param {number} input.limit
   * @returns {Promise<{ rows: Object[], count: number, page: number, limit: number, totalPages: number }>}
   */
  async execute({ search, status, page, limit }: ListSuppliersInput) {
    const offset = (page - 1) * limit;
    const sanitized = search ? Validators.sanitizeSearch(search) : undefined;

    const { count, rows } = await this.suppliersRepository.list({
      limit, offset, search: sanitized, status
    });

    return { rows, count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

module.exports = ListSuppliersUseCase;


