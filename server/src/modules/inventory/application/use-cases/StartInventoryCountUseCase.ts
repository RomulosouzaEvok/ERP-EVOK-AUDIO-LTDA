const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError, BusinessRuleError } = require('../../../../errors');

/**
 * Inicia uma contagem de inventário (transição `draft` → `counting`),
 * cobrindo `POST /api/inventory-counts/:id/start`.
 */
class StartInventoryCountUseCase extends UseCase {
  /** @param {import('../../domain/repositories/InventoryCountRepository')} inventoryCountRepository */
  constructor(inventoryCountRepository) {
    super();
    this.inventoryCountRepository = inventoryCountRepository;
  }

  /**
   * @param {Object} input
   * @param {number} input.id - Id da contagem a iniciar.
   * @returns {Promise<Object>} A contagem atualizada (com itens).
   * @throws {NotFoundError} Se a contagem não existir.
   * @throws {BusinessRuleError} Se a contagem não estiver em status `draft`.
   */
  async execute({ id }) {
    const before = await this.inventoryCountRepository.findRawById(id);
    if (!before) {
      throw new NotFoundError('Contagem de inventário não encontrada');
    }
    if (before.status !== 'draft') {
      throw new BusinessRuleError(`Apenas contagens em status 'draft' podem ser iniciadas. Status atual: '${before.status}'.`);
    }

    await this.inventoryCountRepository.update(id, { status: 'counting', started_at: new Date() });

    return this.inventoryCountRepository.findById(id);
  }
}

module.exports = StartInventoryCountUseCase;


