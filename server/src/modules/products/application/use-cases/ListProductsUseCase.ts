const UseCase = require('../../../../shared/application/UseCase');

/**
 * Lista produtos com filtros de busca e paginação.
 */
class ListProductsUseCase extends UseCase {
  /**
   * @param {import('../../domain/repositories/ProductRepository')} productRepository
   */
  constructor(productRepository) {
    super();
    this.productRepository = productRepository;
  }

  /**
   * @param {Object} input
   * @param {string} [input.search]
   * @param {number} [input.category_id]
   * @param {string} [input.status]
   * @param {boolean} [input.low_stock]
   * @param {number} input.limit
   * @param {number} input.offset
   * @param {number} input.page
   * @returns {Promise<{ rows: Object[], count: number, page: number, limit: number, totalPages: number }>}
   */
  async execute({ search, category_id, status, low_stock, limit, offset, page }) {
    const { rows, count } = await this.productRepository.list(
      { search, category_id, status, low_stock },
      { limit, offset }
    );
    return { rows, count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

module.exports = ListProductsUseCase;


