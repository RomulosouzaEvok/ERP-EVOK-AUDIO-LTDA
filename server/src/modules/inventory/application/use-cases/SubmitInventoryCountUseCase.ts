const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError, BusinessRuleError } = require('../../../../errors');

/**
 * Envia uma contagem de inventário para aprovação (transição `counting` →
 * `pending_approval`), cobrindo `POST /api/inventory-counts/:id/submit`.
 *
 * Exige que a contagem tenha ao menos um item e que todos os itens já
 * tenham sido contados (nenhum em status `pending`).
 */
class SubmitInventoryCountUseCase extends UseCase {
  /** @param {import('../../domain/repositories/InventoryCountRepository')} inventoryCountRepository */
  constructor(inventoryCountRepository) {
    super();
    this.inventoryCountRepository = inventoryCountRepository;
  }

  /**
   * @param {Object} input
   * @param {number} input.id - Id da contagem a enviar para aprovação.
   * @returns {Promise<Object>} A contagem atualizada (com itens).
   * @throws {NotFoundError} Se a contagem não existir.
   * @throws {BusinessRuleError} Se a contagem não estiver em status `counting`, não tiver itens ou tiver itens pendentes de contagem.
   */
  async execute({ id }) {
    const count = await this.inventoryCountRepository.findRawById(id);
    if (!count) {
      throw new NotFoundError('Contagem de inventário não encontrada');
    }
    if (count.status !== 'counting') {
      throw new BusinessRuleError(`Apenas contagens em status 'counting' podem ser enviadas para aprovação. Status atual: '${count.status}'.`);
    }

    const items = await this.inventoryCountRepository.listItems(id);
    if (items.length === 0) {
      throw new BusinessRuleError('A contagem não possui itens. Adicione itens antes de enviar para aprovação.');
    }
    const pendingItems = items.filter((item) => item.status === 'pending');
    if (pendingItems.length > 0) {
      throw new BusinessRuleError(`Existem ${pendingItems.length} item(ns) ainda não contados. Registre a contagem de todos os itens antes de enviar para aprovação.`);
    }

    await this.inventoryCountRepository.update(id, { status: 'pending_approval', completed_at: new Date() });

    return this.inventoryCountRepository.findById(id);
  }
}

module.exports = SubmitInventoryCountUseCase;


