const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError } = require('../../../../errors');

/**
 * Busca uma contagem de inventário por id, com seus itens, cobrindo `GET
 * /api/inventory-counts/:id`.
 */
class GetInventoryCountByIdUseCase extends UseCase {
  /** @param {import('../../domain/repositories/InventoryCountRepository')} inventoryCountRepository */
  constructor(inventoryCountRepository) {
    super();
    this.inventoryCountRepository = inventoryCountRepository;
  }

  /**
   * @param {Object} input
   * @param {number} input.id
   * @returns {Promise<Object>}
   * @throws {NotFoundError} Se a contagem não existir.
   */
  async execute({ id }) {
    const count = await this.inventoryCountRepository.findById(id);
    if (!count) {
      throw new NotFoundError('Contagem de inventário não encontrada');
    }
    return count;
  }
}

module.exports = GetInventoryCountByIdUseCase;


