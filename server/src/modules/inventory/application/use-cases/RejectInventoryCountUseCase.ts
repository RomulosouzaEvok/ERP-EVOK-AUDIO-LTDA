const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError, BusinessRuleError, ConflictError } = require('../../../../errors');

/**
 * Rejeita uma contagem de inventário (transição `pending_approval` →
 * `rejected`), cobrindo `POST /api/inventory-counts/:id/reject`. Nenhum
 * ajuste de estoque é aplicado.
 */
class RejectInventoryCountUseCase extends UseCase {
  /** @param {import('../../domain/repositories/InventoryCountRepository')} inventoryCountRepository */
  constructor(inventoryCountRepository) {
    super();
    this.inventoryCountRepository = inventoryCountRepository;
  }

  /**
   * @param {Object} input
   * @param {number} input.id - Id da contagem a rejeitar.
   * @param {number} input.approverId - Id do usuário que está rejeitando.
   * @param {string} [input.reason] - Motivo da rejeição (armazenado em `notes`).
   * @returns {Promise<Object>} A contagem atualizada (com itens).
   * @throws {NotFoundError} Se a contagem não existir.
   * @throws {BusinessRuleError} Se a contagem não estiver em status `pending_approval`.
   */
  async execute({ id, approverId, reason }) {
    const count = await this.inventoryCountRepository.findRawById(id);
    if (!count) {
      throw new NotFoundError('Contagem de inventário não encontrada');
    }
    if (count.status !== 'pending_approval') {
      throw new BusinessRuleError(`Apenas contagens em status 'pending_approval' podem ser rejeitadas. Status atual: '${count.status}'.`);
    }

    const notes = reason ? `${count.notes ? `${count.notes}\n` : ''}Rejeitada: ${reason}` : count.notes;

    // Transicao atomica condicionada ao status ainda ser 'pending_approval'
    // (evita rejeitar/duplicar sobre uma contagem ja aprovada/rejeitada por
    // outra requisicao concorrente).
    const affected = await this.inventoryCountRepository.updateIfStatus(id, 'pending_approval', {
      status: 'rejected',
      approved_by: approverId,
      approved_at: new Date(),
      notes
    });

    if (affected === 0) {
      throw new ConflictError('Esta contagem já foi aprovada ou rejeitada por outra requisição.');
    }

    return this.inventoryCountRepository.findById(id);
  }
}

module.exports = RejectInventoryCountUseCase;


