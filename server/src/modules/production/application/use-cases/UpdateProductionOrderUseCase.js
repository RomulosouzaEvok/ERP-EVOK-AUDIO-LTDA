const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError, ValidationError } = require('../../../../errors');

const ALLOWED_FIELDS = ['priority', 'due_date', 'responsible_id', 'notes'];

/**
 * Atualiza campos não-status de uma ordem de produção, cobrindo
 * `PUT /api/production-orders/:id`. Alteração de `status` deve ser feita
 * via `ChangeProductionOrderStatusUseCase` (`PUT /:id/status`) — mesma
 * separação do controller legado.
 */
class UpdateProductionOrderUseCase extends UseCase {
  /** @param {import('../../domain/repositories/ProductionOrderRepository')} productionOrderRepository */
  constructor(productionOrderRepository) {
    super();
    this.productionOrderRepository = productionOrderRepository;
  }

  /**
   * @param {Object} input
   * @param {number} input.id
   * @param {Object} input.data - Corpo da requisição (`req.body`).
   * @returns {Promise<{ before: Object, updateData: Object, order: Object }>}
   * @throws {ValidationError} Se `status` estiver presente no corpo.
   * @throws {NotFoundError} Se a OP não existir.
   */
  async execute({ id, data }) {
    if (data.status) {
      throw new ValidationError('Use /:id/status para alterar status');
    }

    const updateData = {};
    for (const field of ALLOWED_FIELDS) {
      if (data[field] !== undefined) updateData[field] = data[field];
    }

    const before = await this.productionOrderRepository.findRawById(id);
    if (!before) {
      throw new NotFoundError('Ordem de produção não encontrada');
    }

    const updated = await this.productionOrderRepository.update(id, updateData);
    if (!updated) {
      throw new NotFoundError('Ordem de produção não encontrada');
    }

    const order = await this.productionOrderRepository.findByIdWithProductSummary(id);

    return { before, updateData, order };
  }
}

module.exports = UpdateProductionOrderUseCase;
