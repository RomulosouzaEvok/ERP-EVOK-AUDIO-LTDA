import UseCase from '../../../../shared/application/UseCase';
import InventoryCountRepository = require('../../domain/repositories/InventoryCountRepository');

const { NotFoundError } = require('../../../../errors');

/**
 * Busca uma contagem de inventário por id, com seus itens, cobrindo `GET
 * /api/inventory-counts/:id`.
 */
class GetInventoryCountByIdUseCase extends UseCase {
  private readonly inventoryCountRepository: InventoryCountRepository;

  /** @param inventoryCountRepository - Repositório de contagens de inventário. */
  constructor(inventoryCountRepository: InventoryCountRepository) {
    super();
    this.inventoryCountRepository = inventoryCountRepository;
  }

  /**
   * @param input - `{ id }`.
   * @returns {Promise<Object>}
   * @throws {NotFoundError} Se a contagem não existir.
   */
  async execute({ id }: { id: number | string }) {
    const count = await this.inventoryCountRepository.findById(id);
    if (!count) {
      throw new NotFoundError('Contagem de inventário não encontrada');
    }
    return count;
  }
}

export = GetInventoryCountByIdUseCase;


