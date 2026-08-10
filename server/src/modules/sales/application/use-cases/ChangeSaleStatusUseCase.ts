import type { Transaction } from 'sequelize';

const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError, ValidationError, BusinessRuleError } = require('../../../../errors');
const InventoryService = require('../../../../services/inventoryService');
const WarehouseStockService = require('../../../../services/warehouseStockService');
const { toCents, fromCents } = require('../../../../shared/utils/money');

/**
 * Maquina de estados de status da venda.
 */
const VALID_TRANSITIONS: Record<string, string[]> = {
  quote: ['confirmed', 'canceled'],
  confirmed: ['invoiced', 'canceled'],
  // 'partially_invoiced' (faturamento parcial, gap 3/3 do modulo sales) e
  // atingido automaticamente por IssueSaleNfeUseCase quando a NF-e emitida
  // cobre apenas parte do saldo pendente de algum item — NAO tem 'shipped'
  // nas transicoes permitidas: embarque continua exigindo a venda
  // totalmente 'invoiced' (saldo pendente zerado em todos os itens).
  partially_invoiced: ['invoiced', 'canceled'],
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
 * F22 — confirmacao de orcamento (`quote -> confirmed`): e neste momento
 * (e nao mais na criacao) que o estoque de cada item e comprometido e as
 * parcelas em `AccountReceivable` sao geradas, usando os mesmos dados
 * persistidos na venda (`total_amount`, `installments`, `payment_method`) e
 * nos itens (`SaleItem`) criados junto do orcamento.
 *
 * GAP G9 (2026-08-10) — confirmar RESERVA, faturar BAIXA. A confirmacao
 * chamava `InventoryService.consume` e dava baixa imediata em
 * `products.quantity`; agora chama `InventoryService.reserve({ saleId })`.
 * Motivo (Ajuste SINIEF 07/05, clausula 1a §1o e clausula 9a §1o): a NF-e e
 * autorizada antes do fato gerador e a mercadoria so transita depois da
 * autorizacao de uso — enquanto o pedido esta apenas `confirmed` a
 * mercadoria continua fisicamente na empresa. A baixa efetiva passou para a
 * autorizacao da NF-e, proporcional a quantidade faturada
 * (`services/saleStockService.ts`).
 *
 * Cancelamento (`status === 'canceled'`) apos o G9 tem DOIS efeitos
 * distintos, porque parte do pedido pode ja ter virado NF-e:
 *  - o saldo ainda **reservado** (nao faturado) e liberado
 *    (`releaseAllReservationsForSale`) e volta a ficar disponivel — nada
 *    entra em `products.quantity`, porque nada tinha saido;
 *  - o saldo ja **faturado** (`SaleItem.invoiced_quantity`, que so existe em
 *    venda `partially_invoiced`/`invoiced`) esse sim saiu do estoque e e
 *    devolvido via `InventoryService.receive` + credito no deposito
 *    ACABADOS.
 * Antes do G9 o cancelamento devolvia `item.quantity` INTEIRA em qualquer
 * situacao — inclusive ao cancelar um `quote`, que nunca tinha debitado
 * nada e portanto ganhava estoque fantasma. Esse defeito desaparece com a
 * regra nova (um `quote` nao tem reserva nem quantidade faturada, entao o
 * cancelamento nao mexe em estoque nenhum).
 *
 * Bloco 4 (multiplos depositos, BUSINESS_RULES.md §12 item 7): reserva NAO
 * movimenta deposito. Toda alteracao de `products.quantity` feita aqui via
 * `InventoryService.receive` continua acompanhada, na MESMA transacao, do
 * dual-write correspondente em `WarehouseStockService.addToWarehouse` para o
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
  constructor(saleRepository: any) {
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
  async execute({ id, status, userId, transaction }: { id: number; status: string; userId: number; transaction: Transaction }) {
    if (!status) {
      throw new ValidationError('Status e obrigatorio');
    }

    if (status === 'invoiced' || status === 'partially_invoiced') {
      // 'invoiced'/'partially_invoiced' (faturamento parcial, gap 3/3)
      // refletem uma NF-e de fato autorizada (modulo fiscal) — nao podem
      // ser setados manualmente via este endpoint generico, sob risco de
      // marcar uma venda como faturada sem NF-e real. Use
      // POST /api/sales/:id/nfe.
      throw new BusinessRuleError(`Status '${status}' e definido automaticamente pela emissao de NF-e (POST /api/sales/:id/nfe), nao pode ser setado manualmente.`);
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
      // (1) Saldo ainda reservado (nao faturado) volta a ficar disponivel.
      // Nao entra nada em `products.quantity`: reserva nao tinha saido.
      await InventoryService.releaseAllReservationsForSale(sale.id, userId, transaction, {
        description: `Cancelamento venda #${sale.id} - reserva liberada`
      });

      // (2) Saldo ja faturado (NF-e emitida) foi de fato baixado do estoque
      // e precisa ser devolvido. `invoiced_quantity` e 0 em venda
      // `quote`/`confirmed`, entao nesses casos este laco nao movimenta
      // nada — o que corrige o estoque fantasma que o cancelamento de
      // orcamento gerava antes do G9.
      let acabadosWarehouse = null;
      for (const item of sale.items) {
        const invoicedQuantity = Number(item.invoiced_quantity || 0);
        if (invoicedQuantity <= 0) continue;

        // Resolvido sob demanda (e uma unica vez) para nao pagar a consulta
        // no caso comum de cancelamento sem nada faturado.
        if (!acabadosWarehouse) {
          acabadosWarehouse = await WarehouseStockService.getWarehouseByCode('ACABADOS', transaction);
        }

        await InventoryService.receive(item.product_id, invoicedQuantity, userId, transaction, {
          description: `Cancelamento venda #${sale.id} - estoque faturado restaurado`,
          referenceId: sale.id,
          referenceType: 'adjustment'
        });

        // Dual-write (Bloco 4, BUSINESS_RULES.md §12 item 3/7): cancelamento
        // de venda credita de volta o deposito ACABADOS na mesma transacao.
        await WarehouseStockService.addToWarehouse(item.product_id, acabadosWarehouse.id, invoicedQuantity, transaction);
      }

      await this.saleRepository.cancelPendingReceivables(sale.id, transaction);
    }

    if (previousStatus === 'quote' && status === 'confirmed') {
      // Reserva o estoque de cada item agora (G9), revalidando a
      // disponibilidade (`quantity - reserved_quantity`) sob lock — mesma
      // regra de erro 404/422 que a criacao de venda ja confirmada aplica.
      // A baixa efetiva so acontece na autorizacao da NF-e.
      for (const item of sale.items) {
        await InventoryService.reserve(item.product_id, item.quantity, userId, transaction, {
          saleId: sale.id,
          description: `Confirmacao de orcamento - Venda #${sale.id}`
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
