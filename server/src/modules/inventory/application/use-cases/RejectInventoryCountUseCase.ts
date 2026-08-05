import UseCase from '../../../../shared/application/UseCase';
import InventoryCountRepository = require('../../domain/repositories/InventoryCountRepository');

const { NotFoundError, BusinessRuleError, ConflictError } = require('../../../../errors');

/** Dados de entrada de `RejectInventoryCountUseCase.execute`. */
interface RejectInventoryCountInput {
  /** Id da contagem a rejeitar. */
  id: number | string;
  /** Id do usuário que está rejeitando. */
  approverId: number;
  /** Motivo da rejeição (armazenado em `notes`). */
  reason?: string;
}

/**
 * Rejeita uma contagem de inventário (transição `pending_approval` →
 * `rejected`), cobrindo `POST /api/inventory-counts/:id/reject`. Nenhum
 * ajuste de estoque é aplicado.
 */
class RejectInventoryCountUseCase extends UseCase {
  private readonly inventoryCountRepository: InventoryCountRepository;

  /** @param inventoryCountRepository - Repositório de contagens de inventário. */
  constructor(inventoryCountRepository: InventoryCountRepository) {
    super();
    this.inventoryCountRepository = inventoryCountRepository;
  }

  /**
   * @param input - `{ id, approverId, reason }`.
   * @returns {Promise<Object>} A contagem atualizada (com itens).
   * @throws {NotFoundError} Se a contagem não existir.
   * @throws {BusinessRuleError} Se a contagem não estiver em status `pending_approval`.
   */
  async execute({ id, approverId, reason }: RejectInventoryCountInput) {
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

export = RejectInventoryCountUseCase;


