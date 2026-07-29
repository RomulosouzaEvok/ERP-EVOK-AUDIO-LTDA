const UseCase = require('../../../../shared/application/UseCase');

/**
 * Lista pedidos de compra com filtros e paginação, cobrindo o fluxo do
 * endpoint `GET /api/purchases`.
 */
class ListPurchasesUseCase extends UseCase {
  /**
   * @param {import('../../domain/repositories/PurchaseRepository')} purchaseRepository
   */
  constructor(purchaseRepository) {
    super();
    this.purchaseRepository = purchaseRepository;
  }

  /**
   * @param {Object} input
   * @param {string} [input.status]
   * @param {number} [input.supplier_id]
   * @param {string} [input.start_date]
   * @param {string} [input.end_date]
   * @param {number} input.page
   * @param {number} input.limit
   * @param {number} input.offset
   * @returns {Promise<{ rows: Object[], count: number, page: number, limit: number, totalPages: number }>}
   */
  async execute({ status, supplier_id, start_date, end_date, page, limit, offset }) {
    const { rows, count } = await this.purchaseRepository.listPurchases(
      { status, supplier_id, start_date, end_date },
      { limit, offset }
    );
    return { rows, count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

module.exports = ListPurchasesUseCase;


