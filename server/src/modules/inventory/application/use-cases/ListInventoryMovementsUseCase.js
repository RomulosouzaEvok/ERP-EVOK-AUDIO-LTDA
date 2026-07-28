const UseCase = require('../../../../shared/application/UseCase');

/**
 * Lista movimentações de estoque com filtros e paginação.
 */
class ListInventoryMovementsUseCase extends UseCase {
  /**
   * @param {import('../../domain/repositories/InventoryRepository')} inventoryRepository
   */
  constructor(inventoryRepository) {
    super();
    this.inventoryRepository = inventoryRepository;
  }

  /**
   * @param {Object} input
   * @param {number} [input.product_id]
   * @param {string} [input.type]
   * @param {string|Date} [input.start_date]
   * @param {string|Date} [input.end_date]
   * @param {number} input.limit
   * @param {number} input.offset
   * @param {number} input.page
   * @returns {Promise<{ rows: Object[], count: number, page: number, limit: number, totalPages: number }>}
   */
  async execute({ product_id, type, start_date, end_date, limit, offset, page }) {
    const { rows, count } = await this.inventoryRepository.listMovements(
      { product_id, type, start_date, end_date },
      { limit, offset }
    );
    return { rows, count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

module.exports = ListInventoryMovementsUseCase;
