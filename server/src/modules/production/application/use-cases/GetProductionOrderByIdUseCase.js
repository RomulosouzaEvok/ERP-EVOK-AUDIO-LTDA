const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError } = require('../../../../errors');

/**
 * Busca uma ordem de produção por id, cobrindo `GET /api/production-orders/:id`.
 */
class GetProductionOrderByIdUseCase extends UseCase {
  /** @param {import('../../domain/repositories/ProductionOrderRepository')} productionOrderRepository */
  constructor(productionOrderRepository) {
    super();
    this.productionOrderRepository = productionOrderRepository;
  }

  /**
   * @param {Object} input
   * @param {number} input.id
   * @returns {Promise<Object>}
   * @throws {NotFoundError} Se a OP não existir.
   */
  async execute({ id }) {
    const order = await this.productionOrderRepository.findById(id);
    if (!order) {
      throw new NotFoundError('Ordem de produção não encontrada');
    }
    return order;
  }
}

module.exports = GetProductionOrderByIdUseCase;
