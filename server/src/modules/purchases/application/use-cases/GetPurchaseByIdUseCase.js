const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError } = require('../../../../errors');

/**
 * Busca um pedido de compra pelo id, com fornecedor e itens (+ produto),
 * cobrindo o fluxo do endpoint `GET /api/purchases/:id`.
 */
class GetPurchaseByIdUseCase extends UseCase {
  /**
   * @param {import('../../domain/repositories/PurchaseRepository')} purchaseRepository
   */
  constructor(purchaseRepository) {
    super();
    this.purchaseRepository = purchaseRepository;
  }

  /**
   * @param {Object} input
   * @param {number} input.id
   * @returns {Promise<Object>} Pedido de compra encontrado.
   * @throws {NotFoundError} Se o pedido não existir.
   */
  async execute({ id }) {
    const purchase = await this.purchaseRepository.findPurchaseById(id);
    if (!purchase) {
      throw new NotFoundError('Pedido não encontrado');
    }
    return purchase;
  }
}

module.exports = GetPurchaseByIdUseCase;
