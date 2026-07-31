const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError, BusinessRuleError, ConflictError } = require('../../../../errors');
const { sequelize } = require('../../../../config/database');
const InventoryService = require('../../../../services/inventoryService');

/**
 * Aprova uma contagem de inventário (transição `pending_approval` →
 * `approved` → `adjusted`), cobrindo `POST
 * /api/inventory-counts/:id/approve`.
 *
 * Para cada item com variância diferente de zero, dispara
 * `InventoryService.adjust` (dentro da MESMA transação) para ajustar
 * `Product.quantity` ao valor fisicamente contado — NUNCA altera
 * `Product.quantity` diretamente. Itens sem variância são apenas marcados
 * como `adjusted` (nada a ajustar em estoque). Ao final, a contagem em si é
 * marcada como `adjusted`.
 */
class ApproveInventoryCountUseCase extends UseCase {
  /** @param {import('../../domain/repositories/InventoryCountRepository')} inventoryCountRepository */
  constructor(inventoryCountRepository) {
    super();
    this.inventoryCountRepository = inventoryCountRepository;
  }

  /**
   * @param {Object} input
   * @param {number} input.id - Id da contagem a aprovar.
   * @param {number} input.approverId - Id do usuário que está aprovando.
   * @returns {Promise<Object>} A contagem atualizada (status `adjusted`, com itens).
   * @throws {NotFoundError} Se a contagem não existir.
   * @throws {BusinessRuleError} Se a contagem não estiver em status `pending_approval`.
   * @throws {Error} Propagado por `InventoryService.adjust` (produto não encontrado, estoque insuficiente para saída, etc.), com `statusCode`.
   */
  async execute({ id, approverId }) {
    const t = await sequelize.transaction();
    try {
      // Lock pessimista: serializa aprovações concorrentes da MESMA
      // contagem. A segunda requisição espera aqui ate a primeira commitar
      // (ou dar rollback), e entao le o status ja atualizado.
      const count = await this.inventoryCountRepository.findRawByIdForUpdate(id, t);
      if (!count) {
        throw new NotFoundError('Contagem de inventário não encontrada');
      }
      if (count.status !== 'pending_approval') {
        throw new BusinessRuleError(`Apenas contagens em status 'pending_approval' podem ser aprovadas. Status atual: '${count.status}'.`);
      }

      const items = await this.inventoryCountRepository.listItems(id, t);
      const adjustments = [];

      for (const item of items) {
        const variance = Number(item.variance_quantity || 0);

        if (variance !== 0) {
          const type = variance > 0 ? 'in' : 'out';
          const quantity = Math.abs(variance);
          const reason = `Ajuste de inventário cíclico ${count.count_number} - item #${item.id} (produto #${item.product_id})`;

          const result = await InventoryService.adjust(item.product_id, type, quantity, approverId, reason, t);
          adjustments.push(result);
        }

        await this.inventoryCountRepository.updateItem(item.id, { status: 'adjusted' }, t);
      }

      // Transicao condicionada (defesa em profundidade alem do lock): so
      // marca 'adjusted' se ainda estiver 'pending_approval'. Zero linhas
      // afetadas indica uma corrida que o lock nao deveria mais permitir,
      // mas evita aplicar o ajuste de estoque silenciosamente sobre uma
      // contagem ja finalizada por outra transacao.
      const affected = await this.inventoryCountRepository.updateIfStatus(id, 'pending_approval', {
        status: 'adjusted',
        approved_by: approverId,
        approved_at: new Date()
      }, t);

      if (affected === 0) {
        throw new ConflictError('Esta contagem já foi aprovada ou rejeitada por outra requisição.');
      }

      await t.commit();

      const updated = await this.inventoryCountRepository.findById(id);
      return { count: updated, adjustments };
    } catch (error) {
      if (!t.finished) await t.rollback();
      throw error;
    }
  }
}

module.exports = ApproveInventoryCountUseCase;


