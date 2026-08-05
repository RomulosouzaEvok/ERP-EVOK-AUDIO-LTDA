import UseCase from '../../../../shared/application/UseCase';
import InventoryRepository = require('../../domain/repositories/InventoryRepository');

const { NotFoundError } = require('../../../../errors');

/**
 * Busca uma movimentação de estoque pelo id.
 */
class GetInventoryMovementByIdUseCase extends UseCase {
  private readonly inventoryRepository: InventoryRepository;

  /** @param inventoryRepository - Repositório de estoque. */
  constructor(inventoryRepository: InventoryRepository) {
    super();
    this.inventoryRepository = inventoryRepository;
  }

  /**
   * @param input - `{ id }`.
   * @returns {Promise<Object>} Movimentação encontrada.
   * @throws {NotFoundError} Se a movimentação não existir.
   */
  async execute({ id }: { id: number | string }) {
    const movement = await this.inventoryRepository.findMovementById(id);
    if (!movement) throw new NotFoundError('Movimentação não encontrada');
    return movement;
  }
}

export = GetInventoryMovementByIdUseCase;


