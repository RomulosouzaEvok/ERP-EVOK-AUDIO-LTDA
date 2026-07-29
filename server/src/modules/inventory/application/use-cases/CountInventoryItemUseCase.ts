const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError, BusinessRuleError, ValidationError } = require('../../../../errors');

/**
 * Registra a quantidade contada fisicamente de um item de uma contagem de
 * inventário, calculando a variância em relação à quantidade de sistema e
 * marcando o item como `counted`. Cobre `POST
 * /api/inventory-counts/:id/items/:itemId/count`.
 */
class CountInventoryItemUseCase extends UseCase {
  /** @param {import('../../domain/repositories/InventoryCountRepository')} inventoryCountRepository */
  constructor(inventoryCountRepository) {
    super();
    this.inventoryCountRepository = inventoryCountRepository;
  }

  /**
   * @param {Object} input
   * @param {number} input.id - Id da contagem (cabeçalho).
   * @param {number} input.itemId - Id do item da contagem.
   * @param {number} input.counted_quantity - Quantidade contada fisicamente (>= 0).
   * @param {string} [input.notes] - Observações do item (ex.: divergência encontrada).
   * @param {number} input.userId - Id do usuário que realizou a contagem física.
   * @returns {Promise<Object>} O item atualizado.
   * @throws {ValidationError} Se `counted_quantity` for inválida.
   * @throws {NotFoundError} Se a contagem ou o item não existirem.
   * @throws {BusinessRuleError} Se a contagem não estiver em status `counting` ou o item não pertencer a ela.
   */
  async execute({ id, itemId, counted_quantity, notes, userId }) {
    const qty = Number(counted_quantity);
    if (counted_quantity === undefined || counted_quantity === null || Number.isNaN(qty)) {
      throw new ValidationError('Quantidade contada (counted_quantity) é obrigatória e deve ser numérica.');
    }
    if (qty < 0) {
      throw new ValidationError('Quantidade contada não pode ser negativa.');
    }

    const count = await this.inventoryCountRepository.findRawById(id);
    if (!count) {
      throw new NotFoundError('Contagem de inventário não encontrada');
    }
    if (count.status !== 'counting') {
      throw new BusinessRuleError(`Só é possível registrar contagens de item quando a contagem está em 'counting'. Status atual: '${count.status}'.`);
    }

    const item = await this.inventoryCountRepository.findItemById(itemId);
    if (!item || item.inventory_count_id !== count.id) {
      throw new NotFoundError('Item de contagem não encontrado nesta contagem de inventário');
    }

    const variance = qty - Number(item.system_quantity);

    await this.inventoryCountRepository.updateItem(itemId, {
      counted_quantity: qty,
      variance_quantity: variance,
      status: 'counted',
      counted_by: userId,
      counted_at: new Date(),
      notes: notes ?? item.notes
    });

    return this.inventoryCountRepository.findItemById(itemId);
  }
}

module.exports = CountInventoryItemUseCase;


