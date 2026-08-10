import type { Transaction } from 'sequelize';

const UseCase = require('../../../../shared/application/UseCase');
const SaleEntity = require('../../domain/entities/SaleEntity');
const { NotFoundError, ValidationError, BusinessRuleError } = require('../../../../errors');
const { toCents, fromCents } = require('../../../../shared/utils/money');
const InventoryService = require('../../../../services/inventoryService');

/**
 * Cria uma venda com seus itens, reservando estoque quando já nasce
 * confirmada, cobrindo o fluxo do endpoint `POST /api/sales`.
 *
 * GAP G13 (2026-08-10 — decisão D-A do dono): **a venda não gera mais
 * conta a receber.** Até esta data a criação confirmada lançava as parcelas
 * em `AccountReceivable` na hora, e a venda à vista nascia com
 * `status: 'paid'` e `payment_date: hoje` — dando quitação sem que nenhum
 * dinheiro tivesse entrado.
 *
 * Base normativa (CPC 47 — Receita de Contrato com Cliente / IFRS 15):
 *  - item **31**: receita quando o cliente obtém o **controle** do bem;
 *  - item **38**: na confirmação do pedido não há posse física, nem
 *    titularidade, nem aceite, nem direito presente a pagamento;
 *  - item **108**: recebível exige direito **incondicional** — o direito
 *    aqui ainda é condicional ao faturamento.
 *
 * O recebível passou para a autorização da NF-e, no valor de cada emissão
 * (`services/saleReceivableService.ts`, chamado por `IssueSaleNfeUseCase` e
 * `GetSaleNfeStatusUseCase`). Cobrança **sem venda** — reembolso, aluguel,
 * venda de sucata — continua sendo caso legítimo e entra por
 * `POST /api/finance/receivable` (decisão D-J).
 *
 * Migrado 1:1 do controller anterior
 * `server/src/controllers/saleController.ts#create`, preservando:
 * - o arredondamento em centavos (F24, já corrigido antes desta migração —
 *   `toCents`/`fromCents` reutilizados de `shared/utils/money.ts` em vez de
 *   helpers locais duplicados), com a última parcela absorvendo o resto da
 *   divisão inteira entre `installments`;
 * - a operação de estoque atômica, que trava a linha do produto
 *   (`SELECT ... FOR UPDATE`) dentro da mesma transação, prevenindo a
 *   condição de corrida corrigida na Fase 4.1;
 * - por padrão (`status` omitido ou `'confirmed'`) a venda é criada já
 *   `confirmed`, com geração de parcelas na hora.
 *
 * GAP G9 (2026-08-10) — venda confirmada RESERVA, não baixa: até esta data
 * a venda criada/confirmada chamava `InventoryService.consume` e dava baixa
 * imediata em `products.quantity`. Isso registrava saída de mercadoria que
 * ainda estava fisicamente na empresa (Ajuste SINIEF 07/05, cláusula 9ª
 * §1º: a mercadoria só transita depois da autorização de uso da NF-e).
 * Agora a venda confirmada chama `InventoryService.reserve({ saleId })` — o
 * material fica comprometido (indisponível para outro pedido) mas continua
 * no saldo; a baixa efetiva ocorre na autorização da NF-e, proporcional à
 * quantidade faturada (ver `services/saleStockService.ts`).
 *
 * Consequência no dual-write de depósito: **reserva não movimenta
 * depósito**. `WarehouseStockService.removeFromWarehouse` deixou de ser
 * chamado aqui e passou para o faturamento, junto do `consume`, para a
 * invariante "saldo_total = SOMA por depósito" (`BUSINESS_RULES.md` §12
 * item 3) continuar valendo em todo instante.
 *
 * F22 — fluxo de orçamento (`status: 'quote'`): quando o chamador informa
 * explicitamente `status: 'quote'`, a venda e seus itens são persistidos
 * normalmente, mas **nenhum estoque é reservado nem debitado**. A
 * validação de quantidade disponível em
 * estoque também é adiada — um orçamento pode ser criado mesmo sem estoque
 * suficiente no momento, pois nada está sendo comprometido de fato. A
 * reserva (e a validação de estoque suficiente) só acontece quando o
 * orçamento é confirmado via `ChangeSaleStatusUseCase` (transição
 * `quote -> confirmed`).
 */
class CreateSaleUseCase extends UseCase {
  /**
   * @param {import('../../domain/repositories/SaleRepository')} saleRepository
   */
  constructor(saleRepository: any) {
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
   * @throws {Error} Com `statusCode` 404/422 propagado de `InventoryService.reserve` se o estoque disponível for insuficiente no momento da reserva (revalidado sob lock), quando `status: 'confirmed'`.
   */
  async execute({ customer_id, items, discount = 0, payment_method, installments = 1, notes, status = 'confirmed', userId, transaction }: {
    customer_id: number;
    items: Array<{ product_id: number; quantity: number; unit_price: number }>;
    discount?: number;
    payment_method?: string;
    installments?: number;
    notes?: string;
    status?: 'quote' | 'confirmed';
    userId: number;
    transaction: Transaction;
  }) {
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
    // RESERVA o estoque atomicamente (G9): InventoryService trava a linha do
    // Product (SELECT ... FOR UPDATE) dentro desta mesma transação, revalida
    // a quantidade disponível (`quantity - reserved_quantity`) e cria a
    // reserva com a venda como dona, prevenindo que vendas concorrentes
    // comprometam o mesmo material. Quando `status: 'quote'` (F22), nada é
    // reservado aqui — fica adiado para a confirmação do orçamento.
    for (const item of processedItems) {
      await this.saleRepository.createSaleItem({
        sale_id: sale.id, product_id: item.product_id,
        quantity: item.quantity, unit_price: item.unit_price, total_price: item.total_price
      }, transaction);

      if (!isQuote) {
        // Erros lançados aqui (statusCode 404/422) propagam para o controller,
        // que já está preparado para repassá-los ao errorHandler central.
        await InventoryService.reserve(item.product_id, item.quantity, userId, transaction, {
          saleId: sale.id,
          description: `Reserva da venda #${sale.id} - ${entity.payment_method}`
        });
      }
    }

    // GAP G13 (2026-08-10): NENHUMA parcela em `AccountReceivable` é criada
    // aqui — nem em orçamento, nem em venda já confirmada. Ver o JSDoc da
    // classe. O recebível nasce na autorização da NF-e
    // (`services/saleReceivableService.ts`).
    return { sale, totalNet };
  }
}

module.exports = CreateSaleUseCase;
