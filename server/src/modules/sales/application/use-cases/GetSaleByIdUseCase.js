const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError } = require('../../../../errors');

/**
 * Busca uma venda pelo id, com cliente e itens (+ produto), cobrindo o
 * fluxo do endpoint `GET /api/sales/:id`.
 */
class GetSaleByIdUseCase extends UseCase {
  /**
   * @param {import('../../domain/repositories/SaleRepository')} saleRepository
   */
  constructor(saleRepository) {
    super();
    this.saleRepository = saleRepository;
  }

  /**
   * @param {Object} input
   * @param {number} input.id
   * @returns {Promise<Object>} Venda encontrada.
   * @throws {NotFoundError} Se a venda não existir.
   */
  async execute({ id }) {
    const sale = await this.saleRepository.findSaleById(id);
    if (!sale) {
      throw new NotFoundError('Venda não encontrada');
    }
    return sale;
  }
}

module.exports = GetSaleByIdUseCase;
