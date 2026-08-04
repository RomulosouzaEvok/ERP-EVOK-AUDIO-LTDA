const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError, ValidationError, BusinessRuleError } = require('../../../../errors');
const InventoryService = require('../../../../services/inventoryService');
const WarehouseStockService = require('../../../../services/warehouseStockService');
const { toCents, fromCents } = require('../../../../shared/utils/money');

/**
 * Maquina de estados de status da venda.
 */
const VALID_TRANSITIONS = {
  quote: ['confirmed', 'canceled'],
  confirmed: ['invoiced', 'canceled'],
  // 'shipped' (expedicao) so pode ser atingido a partir de 'invoiced' (venda
  // ja faturada/NF-e emitida). Cancelamento a partir de 'invoiced' ainda e
  // permitido (nota pode ser cancelada antes de embarcar).
  invoiced: ['shipped', 'canceled'],
  // 'shipped' e terminal: a mercadoria ja saiu para o cliente, nao pode
  // retornar a nenhum outro status neste fluxo, nem ser cancelada aqui
  // (ver bloqueio explicito abaixo com mensagem 422 dedicada).
  shipped: [],
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
 *
 * Bloco 4 (multiplos depositos, BUSINESS_RULES.md §12 item 7): expedicao/
 * venda sempre debita/credita o deposito 'ACABADOS'. Toda alteracao de
 * `products.quantity` feita aqui via `InventoryService.consume`/`receive`
 * e acompanhada, na MESMA transacao, do dual-write correspondente em
 * `WarehouseStockService.removeFromWarehouse`/`addToWarehouse` para o
 * deposito 'ACABADOS', preservando a invariante de soma por deposito.
 *
 * Tratamento diferenciado da transicao `invoiced -> shipped` (pendencia
 * registrada em docs/governance/TODO.md, Bloco 1.2): `PUT /:id/status` e um
 * endpoint generico compartilhado por qualquer transicao de status de
 * venda, mas embarque (`shipped`) e a unica transicao cuja pre-condicao de
 * negocio nao e garantida so pela maquina de estados. `status === 'invoiced'`
 * so e atingido automaticamente quando a NF-e e autorizada
 * (`IssueSaleNfeUseCase`), mas a NF-e pode ser cancelada DEPOIS disso
 * (`CancelSaleNfeUseCase`) sem reverter `sale.status` — nesse caso a venda
 * continua `invoiced` porem sem NF-e valida. Por isso, alem da tabela
 * generica `VALID_TRANSITIONS`, a transicao para `shipped` exige checagem
 * extra e dedicada: `sale.nfe_status === 'authorized'` no momento do
 * embarque, com erro 422 (`BusinessRuleError`) e `details.nfe_status`
 * explicito quando a checagem falhar.
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

    if (sale.status === 'shipped' && status === 'canceled') {
      // Mensagem 422 dedicada (mais clara que o erro generico de transicao
      // invalida abaixo): a mercadoria ja foi expedida ao cliente, entao a
      // venda nao pode mais ser cancelada por este endpoint.
      throw new BusinessRuleError(
        'Venda ja foi expedida (status shipped) e nao pode ser cancelada.'
      );
    }

    const allowed = VALID_TRANSITIONS[sale.status] || [];
    if (!allowed.includes(status)) {
      throw new BusinessRuleError(
        `Transicao de status invalida: ${sale.status} -> ${status}. Permitidas: ${allowed.join(', ') || 'nenhuma'}`
      );
    }

    if (status === 'shipped' && sale.nfe_status !== 'authorized') {
      // Tratamento diferenciado da transicao para 'shipped' (ver JSDoc da
      // classe): a venda pode estar 'invoiced' com a NF-e ja cancelada
      // depois da emissao (nfe_status muda, sale.status nao reverte), entao
      // a maquina de estados generica acima nao e suficiente para proteger
      // o embarque. `details.nfe_status` explicito para o alerta didatico
      // do frontend (UC-43, BUSINESS_RULES.md §13.5 item 3).
      throw new BusinessRuleError(
        `Venda nao pode ser expedida: NF-e nao esta autorizada (nfe_status atual: '${sale.nfe_status || 'pending'}').`,
        { nfe_status: sale.nfe_status || 'pending', sale_status: sale.status }
      );
    }

    const previousStatus = sale.status;

    if (status === 'canceled') {
      // Resolve o deposito ACABADOS uma unica vez para todos os itens
      // (mesmo padrao de ChangeProductionOrderStatusUseCase/
      // ReceivePurchaseItemsUseCase).
      const acabadosWarehouse = await WarehouseStockService.getWarehouseByCode('ACABADOS', transaction);

      for (const item of sale.items) {
        await InventoryService.receive(item.product_id, item.quantity, userId, transaction, {
          description: `Cancelamento venda #${sale.id} - estoque restaurado`,
          referenceId: sale.id,
          referenceType: 'adjustment'
        });

        // Dual-write (Bloco 4, BUSINESS_RULES.md §12 item 3/7): cancelamento
        // de venda credita de volta o deposito ACABADOS na mesma transacao.
        await WarehouseStockService.addToWarehouse(item.product_id, acabadosWarehouse.id, item.quantity, transaction);
      }

      await this.saleRepository.cancelPendingReceivables(sale.id, transaction);
    }

    if (previousStatus === 'quote' && status === 'confirmed') {
      // Resolve o deposito ACABADOS uma unica vez para todos os itens.
      const acabadosWarehouse = await WarehouseStockService.getWarehouseByCode('ACABADOS', transaction);

      // Debita estoque de cada item agora, revalidando disponibilidade sob
      // lock (mesma regra de erro 404/409 que ja existia na criacao da
      // venda confirmada diretamente).
      for (const item of sale.items) {
        await InventoryService.consume(item.product_id, item.quantity, userId, transaction, {
          description: `Confirmacao de orcamento - Venda #${sale.id}`,
          referenceId: sale.id,
          referenceType: 'sale'
        });

        // Dual-write (Bloco 4, BUSINESS_RULES.md §12 item 3/7): confirmacao
        // de orcamento (expedicao/venda) sempre debita o deposito ACABADOS
        // na mesma transacao.
        await WarehouseStockService.removeFromWarehouse(item.product_id, acabadosWarehouse.id, item.quantity, transaction);
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
