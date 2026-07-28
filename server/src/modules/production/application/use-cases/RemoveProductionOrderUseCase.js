const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError, BusinessRuleError } = require('../../../../errors');

/**
 * Remove uma ordem de produção, cobrindo `DELETE /api/production-orders/:id`.
 * OPs em andamento (`in_progress`) ou concluídas (`completed`) não podem
 * ser removidas — mesma regra do controller legado.
 */
class RemoveProductionOrderUseCase extends UseCase {
  /** @param {import('../../domain/repositories/ProductionOrderRepository')} productionOrderRepository */
  constructor(productionOrderRepository) {
    super();
    this.productionOrderRepository = productionOrderRepository;
  }

  /**
   * @param {Object} input
   * @param {number} input.id
   * @returns {Promise<Object>} A OP removida (estado anterior).
   * @throws {NotFoundError} Se a OP não existir.
   * @throws {BusinessRuleError} Se a OP estiver `in_progress` ou `completed`.
   */
  async execute({ id }) {
    const order = await this.productionOrderRepository.findRawById(id);
    if (!order) {
      throw new NotFoundError('Ordem de produção não encontrada');
    }
    if (['in_progress', 'completed'].includes(order.status)) {
      throw new BusinessRuleError('Ordens em andamento ou concluídas não podem ser removidas');
    }

    await this.productionOrderRepository.destroy(id);

    return order;
  }
}

module.exports = RemoveProductionOrderUseCase;
