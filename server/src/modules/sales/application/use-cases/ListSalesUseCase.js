const UseCase = require('../../../../shared/application/UseCase');

/**
 * Lista vendas com filtros e paginação, cobrindo o fluxo do endpoint
 * `GET /api/sales`.
 */
class ListSalesUseCase extends UseCase {
  /**
   * @param {import('../../domain/repositories/SaleRepository')} saleRepository
   */
  constructor(saleRepository) {
    super();
    this.saleRepository = saleRepository;
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
  async execute({ status, customer_id, start_date, end_date, page, limit, offset }) {
    const { rows, count } = await this.saleRepository.listSales(
      { status, customer_id, start_date, end_date },
      { limit, offset }
    );

    // Anexa `items_count` a cada venda, comportamento preservado 1:1 do
    // controller legado `server/src/controllers/saleController.js#list`.
    const salesWithCount = rows.map(s => ({
      ...s.toJSON(),
      items_count: s.items ? s.items.length : 0
    }));

    return { rows: salesWithCount, count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

module.exports = ListSalesUseCase;
