const UseCase = require('../../../../shared/application/UseCase');
const SaleEntity = require('../../domain/entities/SaleEntity');
const { NotFoundError, ValidationError, BusinessRuleError } = require('../../../../errors');
const { toCents, fromCents } = require('../../../../shared/utils/money');
const InventoryService = require('../../../../services/inventoryService');

/**
 * Cria uma venda com seus itens, opcionalmente debitando estoque e gerando
 * as parcelas em `AccountReceivable`, cobrindo o fluxo do endpoint
 * `POST /api/sales`.
 *
 * Migrado 1:1 do controller anterior
 * `server/src/controllers/saleController.ts#create`, preservando:
 * - o arredondamento em centavos (F24, já corrigido antes desta migração —
 *   `toCents`/`fromCents` reutilizados de `shared/utils/money.ts` em vez de
 *   helpers locais duplicados), com a última parcela absorvendo o resto da
 *   divisão inteira entre `installments`;
 * - a baixa de estoque atômica via `InventoryService.consume`, que trava a
 *   linha do produto (`SELECT ... FOR UPDATE`) dentro da mesma transação,
 *   prevenindo a condição de corrida corrigida na Fase 4.1;
 * - por padrão (`status` omitido ou `'confirmed'`) a venda é criada já
 *   `confirmed`, com débito de estoque e geração de parcelas na hora —
 *   comportamento 100% preservado.
 *
 * F22 — fluxo de orçamento (`status: 'quote'`): quando o chamador informa
 * explicitamente `status: 'quote'`, a venda e seus itens são persistidos
 * normalmente, mas **nenhum estoque é debitado** (`InventoryService.consume`
 * não é chamado) e **nenhuma `AccountReceivable` é gerada**. A validação de
 * quantidade disponível em estoque também é adiada — um orçamento pode ser
 * criado mesmo sem estoque suficiente no momento, pois nada está sendo
 * reservado/consumido de fato. A baixa real (e a validação de estoque
 * suficiente) só acontece quando o orçamento é confirmado via
 * `ChangeSaleStatusUseCase` (transição `quote -> confirmed`).
 */
class CreateSaleUseCase extends UseCase {
  /**
   * @param {import('../../domain/repositories/SaleRepository')} saleRepository
   */
  constructor(saleRepository) {
    super();
    this.saleRepository = saleRepository;
  }

  /**
   * @param {Object} input
   * @param {number} input.customer_id
   * @param {Array<{product_id:number, quantity:number, unit_price:number}>} input.items
   * @param {number} [input.discount=0]
   * @param {string} [input.payment_method]
   * @param {number} [input.installments=1]
   * @param {string} [input.notes]
   * @param {'quote'|'confirmed'} [input.status='confirmed'] - `'quote'` cria um orçamento sem debitar estoque nem gerar parcelas (F22); `'confirmed'` (padrão) preserva o comportamento anterior.
   * @param {number} input.userId - Id do usuário que registra a venda (`user_id` / autor do `InventoryMovement`).
   * @param {import('sequelize').Transaction} input.transaction - Transação Sequelize ativa (criada pelo controller).
   * @returns {Promise<Object>} A venda criada (sem includes; o controller busca a versão completa após o commit).
   * @throws {ValidationError} Se os dados de entrada forem inválidos (forma) ou o desconto exceder o total.
   * @throws {NotFoundError} Se algum `product_id` referenciado não existir.
   * @throws {BusinessRuleError} Se algum produto estiver inativo ou (quando `status: 'confirmed'`) sem estoque suficiente.
   * @throws {Error} Com `statusCode` 404/409 propagado de `InventoryService.consume` se o estoque for insuficiente no momento da baixa (revalidado sob lock), quando `status: 'confirmed'`.
   */
  async execute({ customer_id, items, discount = 0, payment_method, installments = 1, notes, status = 'confirmed', userId, transaction }) {
    const entity = new SaleEntity({ customer_id, items, discount, payment_method, installments, notes });
    const isQuote = status === 'quote';

    let totalCents = 0;
    const processedItems = [];

    for (const item of entity.items) {
      const qty = parseFloat(item.quantity);
      const unitPrice = parseFloat(item.unit_price);
      const unitPriceCents = toCents(unitPrice);

      const product = await this.saleRepository.findProductById(item.product_id, transaction);
      if (!product) {
        throw new NotFoundError(`Produto ID ${item.product_id} não encontrado`);
      }
      if (product.status !== 'active') {
        throw new BusinessRuleError(`Produto ${product.name} está inativo`);
      }
      // A validação de estoque suficiente é adiada para o momento da
      // confirmação (`ChangeSaleStatusUseCase`, transição quote -> confirmed)
      // quando a venda está sendo criada apenas como orçamento — nada é
      // debitado agora, então a falta de estoque não deve bloquear o quote.
      if (!isQuote && product.quantity < qty) {
        throw new BusinessRuleError(`Estoque insuficiente para ${product.name}. Disponível: ${product.quantity}`);
      }

      const totalPriceCents = qty * unitPriceCents;
      totalCents += totalPriceCents;
      processedItems.push({
        product_id: item.product_id,
        quantity: qty,
        unit_price: fromCents(unitPriceCents),
        total_price: fromCents(totalPriceCents)
      });
    }

    const discountCents = toCents(entity.discount);
    if (discountCents > totalCents) {
      throw new ValidationError('Desconto não pode ser maior que o valor total');
    }

    const totalNetCents = totalCents - discountCents;
    const totalNet = fromCents(totalNetCents);

    const sale = await this.saleRepository.createSale({
      customer_id: entity.customer_id,
      user_id: userId,
      total_amount: totalNet,
      discount: fromCents(discountCents),
      status: isQuote ? 'quote' : 'confirmed',
      payment_method: entity.payment_method,
      installments: entity.installments,
      notes: entity.notes
    }, transaction);

    // Cria os itens de venda. Quando `status: 'confirmed'` (padrão), também
    // debita estoque atomicamente: InventoryService trava a linha do Product
    // (SELECT ... FOR UPDATE) dentro desta mesma transação, revalida a
    // quantidade disponível e registra o InventoryMovement, prevenindo que
    // vendas concorrentes deixem o estoque negativo. Quando `status: 'quote'`
    // (F22), nenhuma baixa de estoque acontece aqui — fica adiada para a
    // confirmação do orçamento.
    for (const item of processedItems) {
      await this.saleRepository.createSaleItem({
        sale_id: sale.id, product_id: item.product_id,
        quantity: item.quantity, unit_price: item.unit_price, total_price: item.total_price
      }, transaction);

      if (!isQuote) {
        // Erros lançados aqui (statusCode 404/409) propagam para o controller,
        // que já está preparado para repassá-los ao errorHandler central.
        await InventoryService.consume(item.product_id, item.quantity, userId, transaction, {
          description: `Venda #${sale.id} - ${entity.payment_method}`,
          referenceId: sale.id,
          referenceType: 'sale'
        });
      }
    }

    // Orçamento (F22): nenhuma parcela em `AccountReceivable` é gerada na
    // criação — isso só acontece quando o orçamento for confirmado.
    if (isQuote) {
      return { sale, totalNet };
    }

    // Gera as contas a receber (parcelas).
    if (entity.installments > 1) {
      const baseInstallmentCents = Math.floor(totalNetCents / entity.installments);
      const remainderCents = totalNetCents % entity.installments;
      const today = new Date();
      const day = today.getDate();
      for (let i = 1; i <= entity.installments; i++) {
        // Calcula o próximo mês com segurança - evita overflow de data do JS
        // (ex.: 31/Jan + 1 mês = 03/Mar).
        const nextMonth = today.getMonth() + i;
        const year = today.getFullYear() + Math.floor(nextMonth / 12);
        const month = nextMonth % 12;
        const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
        const safeDay = Math.min(day, lastDayOfMonth);
        const dueDate = new Date(year, month, safeDay);
        // A última parcela absorve o resto da divisão inteira em centavos (F24).
        const amount = fromCents(baseInstallmentCents + (i === entity.installments ? remainderCents : 0));
        await this.saleRepository.createAccountReceivable({
          sale_id: sale.id, customer_id: entity.customer_id, installment: i,
          amount, due_date: dueDate, status: 'pending'
        }, transaction);
      }
    } else {
      await this.saleRepository.createAccountReceivable({
        sale_id: sale.id, customer_id: entity.customer_id, installment: 1,
        amount: totalNet, due_date: new Date(), status: 'paid',
        payment_date: new Date(), payment_method: entity.payment_method
      }, transaction);
    }

    return { sale, totalNet };
  }
}

module.exports = CreateSaleUseCase;


