const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError, ValidationError, BusinessRuleError } = require('../../../../errors');
const InventoryService = require('../../../../services/inventoryService');

/**
 * Maquina de estados de status da venda.
 */
const VALID_TRANSITIONS = {
  quote: ['confirmed', 'canceled'],
  confirmed: ['invoiced', 'canceled'],
  invoiced: ['canceled'],
  canceled: []
};

/**
 * Altera o status de uma venda respeitando `VALID_TRANSITIONS`.
 *
 * Ao cancelar (`status === 'canceled'`), restaura o estoque de cada item
 * via `InventoryService.receive` e cancela todas as `AccountReceivable`
 * pendentes/nao pagas da venda dentro da mesma transacao.
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
   * @param {string} input.status
   * @param {number} input.userId
   * @param {import('sequelize').Transaction} input.transaction
   * @returns {Promise<{ sale: Object, previousStatus: string }>}
   */
  async execute({ id, status, userId, transaction }) {
    if (!status) {
      throw new ValidationError('Status e obrigatorio');
    }

    const sale = await this.saleRepository.findSaleWithItemsForUpdate(id, transaction);
    if (!sale) {
      throw new NotFoundError('Venda nao encontrada');
    }

    if (sale.status === status) {
      throw new ValidationError(`Venda ja esta com status ${status}`);
    }

    const allowed = VALID_TRANSITIONS[sale.status] || [];
    if (!allowed.includes(status)) {
      throw new BusinessRuleError(
        `Transicao de status invalida: ${sale.status} -> ${status}. Permitidas: ${allowed.join(', ') || 'nenhuma'}`
      );
    }

    const previousStatus = sale.status;

    if (status === 'canceled') {
      for (const item of sale.items) {
        await InventoryService.receive(item.product_id, item.quantity, userId, transaction, {
          description: `Cancelamento venda #${sale.id} - estoque restaurado`,
          referenceId: sale.id,
          referenceType: 'adjustment'
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
