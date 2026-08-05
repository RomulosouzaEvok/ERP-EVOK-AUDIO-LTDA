import UseCase from '../../../../shared/application/UseCase';
import InventoryCountRepository = require('../../domain/repositories/InventoryCountRepository');

const { NotFoundError, BusinessRuleError, ValidationError } = require('../../../../errors');

/** Dados de entrada de `CountInventoryItemUseCase.execute`. */
interface CountInventoryItemInput {
  /** Id da contagem (cabeçalho). */
  id: number | string;
  /** Id do item da contagem. */
  itemId: number | string;
  /** Quantidade contada fisicamente (>= 0). */
  counted_quantity: number;
  /** Observações do item (ex.: divergência encontrada). */
  notes?: string;
  /** Id do usuário que realizou a contagem física. */
  userId: number;
}

/**
 * Registra a quantidade contada fisicamente de um item de uma contagem de
 * inventário, calculando a variância em relação à quantidade de sistema e
 * marcando o item como `counted`. Cobre `POST
 * /api/inventory-counts/:id/items/:itemId/count`.
 */
class CountInventoryItemUseCase extends UseCase {
  private readonly inventoryCountRepository: InventoryCountRepository;

  /** @param inventoryCountRepository - Repositório de contagens de inventário. */
  constructor(inventoryCountRepository: InventoryCountRepository) {
    super();
    this.inventoryCountRepository = inventoryCountRepository;
  }

  /**
   * @param input - Dados da contagem do item.
   * @returns {Promise<Object>} O item atualizado.
   * @throws {ValidationError} Se `counted_quantity` for inválida.
   * @throws {NotFoundError} Se a contagem ou o item não existirem.
   * @throws {BusinessRuleError} Se a contagem não estiver em status `counting` ou o item não pertencer a ela.
   */
  async execute({ id, itemId, counted_quantity, notes, userId }: CountInventoryItemInput) {
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

export = CountInventoryItemUseCase;


