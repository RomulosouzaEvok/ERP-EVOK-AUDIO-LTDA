const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError } = require('../../../../errors');

/**
 * Busca uma movimentação de estoque pelo id.
 */
class GetInventoryMovementByIdUseCase extends UseCase {
  /**
   * @param {import('../../domain/repositories/InventoryRepository')} inventoryRepository
   */
  constructor(inventoryRepository) {
    super();
    this.inventoryRepository = inventoryRepository;
  }

  /**
   * @param {Object} input
   * @param {number} input.id
   * @returns {Promise<Object>} Movimentação encontrada.
   * @throws {NotFoundError} Se a movimentação não existir.
   */
  async execute({ id }) {
    const movement = await this.inventoryRepository.findMovementById(id);
    if (!movement) throw new NotFoundError('Movimentação não encontrada');
    return movement;
  }
}

module.exports = GetInventoryMovementByIdUseCase;
