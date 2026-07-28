const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError, ValidationError, BusinessRuleError } = require('../../../../errors');
const InventoryService = require('../../../../services/inventoryService');

/**
 * Máquina de estados de status da venda — single source of truth, migrada
 * 1:1 do controller legado `server/src/controllers/saleController.js`.
 */
const VALID_TRANSITIONS = {
  quote: ['confirmed', 'canceled'],
  confirmed: ['invoiced', 'canceled'],
  invoiced: ['canceled'],
  canceled: []
};

/**
 * Altera o status de uma venda respeitando `VALID_TRANSITIONS`, cobrindo o
 * fluxo do endpoint `PUT /api/sales/:id/status`.
 *
 * Ao cancelar (`status === 'canceled'`), restaura o estoque de cada item
 * via `InventoryService.receive` e cancela todas as `AccountReceivable`
 * pendentes/não pagas da venda — comportamento preservado 1:1 do controller
 * legado, já transacional.
 */
class ChangeSaleStatusUseCase extends UseCase {
  /**
   * @param {import('../../domain/repositories/SaleRepository')} saleRepository
   */
  constructor(saleRepository) {
    super();
    this.saleRepository = saleRepository;
  }

  /**
   * @param {Object} input
   * @param {number} input.id
   * @param {string} input.status - Novo status desejado.
   * @param {number} input.userId - Id do usuário que altera o status (autor do `InventoryMovement` de restauração, quando aplicável).
   * @param {import('sequelize').Transaction} input.transaction - Transação Sequelize ativa (criada pelo controller).
   * @returns {Promise<{ sale: Object, previousStatus: string }>}
   * @throws {ValidationError} Se `status` ausente ou igual ao atual.
   * @throws {NotFoundError} Se a venda não existir.
   * @throws {BusinessRuleError} Se a transição de status for inválida.
   */
  async execute({ id, status, userId, transaction }) {
    if (!status) {
      throw new ValidationError('Status é obrigatório');
    }

    const sale = await this.saleRepository.findSaleWithItems(id, transaction);
    if (!sale) {
      throw new NotFoundError('Venda não encontrada');
    }

    const allowed = VALID_TRANSITIONS[sale.status] || [];
    if (!allowed.includes(status)) {
      throw new BusinessRuleError(
        `Transição de status inválida: ${sale.status} → ${status}. Permitidas: ${allowed.join(', ') || 'nenhuma'}`
      );
    }

    if (sale.status === status) {
      throw new ValidationError(`Venda já está com status ${status}`);
    }

    const previousStatus = sale.status;

    if (status === 'canceled') {
      for (const item of sale.items) {
        await InventoryService.receive(item.product_id, item.quantity, transaction, {
          user_id: userId,
          description: `Cancelamento venda #${sale.id} - estoque restaurado`,
          reference_id: sale.id,
          reference_type: 'adjustment'
        });
      }
      await this.saleRepository.cancelPendingReceivables(sale.id, transaction);
    }

    sale.status = status;
    await sale.save({ transaction });

    return { sale, previousStatus };
  }
}

module.exports = ChangeSaleStatusUseCase;
module.exports.VALID_TRANSITIONS = VALID_TRANSITIONS;
