const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError, ValidationError, BusinessRuleError } = require('../../../../errors');
const InventoryService = require('../../../../services/inventoryService');
const { toCents, fromCents } = require('../../../../shared/utils/money');

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
 *
 * F22 — confirmacao de orcamento (`quote -> confirmed`): e neste momento
 * (e nao mais na criacao) que o estoque de cada item e debitado via
 * `InventoryService.consume` (com a mesma revalidacao de estoque
 * insuficiente sob lock que ja existia na criacao) e as parcelas em
 * `AccountReceivable` sao geradas, usando os mesmos dados persistidos na
 * venda (`total_amount`, `installments`, `payment_method`) e nos itens
 * (`SaleItem`) criados junto do orcamento.
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

    if (status === 'invoiced') {
      // 'invoiced' agora reflete uma NF-e de fato autorizada (modulo
      // fiscal) — nao pode mais ser setado manualmente via este endpoint
      // generico, sob risco de marcar uma venda como faturada sem NF-e
      // real. Use POST /api/sales/:id/nfe.
      throw new BusinessRuleError("Status 'invoiced' e definido automaticamente pela emissao de NF-e (POST /api/sales/:id/nfe), nao pode ser setado manualmente.");
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

    if (previousStatus === 'quote' && status === 'confirmed') {
      // Debita estoque de cada item agora, revalidando disponibilidade sob
      // lock (mesma regra de erro 404/409 que ja existia na criacao da
      // venda confirmada diretamente).
      for (const item of sale.items) {
        await InventoryService.consume(item.product_id, item.quantity, userId, transaction, {
          description: `Confirmacao de orcamento - Venda #${sale.id}`,
          referenceId: sale.id,
          referenceType: 'sale'
        });
      }

      // Gera as parcelas em AccountReceivable adiadas da criacao (F22),
      // usando os mesmos dados persistidos na venda/itens do orcamento e a
      // mesma logica de arredondamento em centavos (F24).
      const totalNetCents = toCents(parseFloat(sale.total_amount));
      const installments = sale.installments || 1;

      if (installments > 1) {
        const baseInstallmentCents = Math.floor(totalNetCents / installments);
        const remainderCents = totalNetCents % installments;
        const today = new Date();
        const day = today.getDate();
        for (let i = 1; i <= installments; i++) {
          const nextMonth = today.getMonth() + i;
          const year = today.getFullYear() + Math.floor(nextMonth / 12);
          const month = nextMonth % 12;
          const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
          const safeDay = Math.min(day, lastDayOfMonth);
          const dueDate = new Date(year, month, safeDay);
          const amount = fromCents(baseInstallmentCents + (i === installments ? remainderCents : 0));
          await this.saleRepository.createAccountReceivable({
            sale_id: sale.id, customer_id: sale.customer_id, installment: i,
            amount, due_date: dueDate, status: 'pending'
          }, transaction);
        }
      } else {
        await this.saleRepository.createAccountReceivable({
          sale_id: sale.id, customer_id: sale.customer_id, installment: 1,
          amount: fromCents(totalNetCents), due_date: new Date(), status: 'paid',
          payment_date: new Date(), payment_method: sale.payment_method
        }, transaction);
      }
    }

    sale.status = status;
    await sale.save({ transaction });

    return { sale, previousStatus };
  }
}

module.exports = ChangeSaleStatusUseCase;
module.exports.VALID_TRANSITIONS = VALID_TRANSITIONS;
