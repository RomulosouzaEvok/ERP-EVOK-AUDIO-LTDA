import type { Transaction } from 'sequelize';
import type PurchaseRepository = require('../../domain/repositories/PurchaseRepository');

const UseCase = require('../../../../shared/application/UseCase');
const PurchaseEntity = require('../../domain/entities/PurchaseEntity');
const { NotFoundError } = require('../../../../errors');

interface CreatePurchaseInput {
  supplier_id: number | string;
  items: Array<{ product_id: number | string; quantity: number | string; unit_price: number | string }>;
  notes?: string;
  expected_date?: string | Date;
  userId: number;
  transaction: Transaction;
}

/**
 * Cria um pedido de compra (Purchase Order) com seus itens, cobrindo o
 * fluxo do endpoint `POST /api/purchases`.
 *
 * A `PurchaseEntity` valida apenas a FORMA da entrada (fornecedor, itens
 * não vazios, quantidade/preço unitário positivos); a existência real de
 * cada produto no banco e o cálculo do total continuam sendo feitos aqui,
 * dentro da transação recebida do controller, exatamente como no
 * controller anterior `server/src/controllers/purchaseController.ts`.
 */
class CreatePurchaseUseCase extends UseCase {
  /**
   * @param {import('../../domain/repositories/PurchaseRepository')} purchaseRepository
   */
  private purchaseRepository: PurchaseRepository;

  constructor(purchaseRepository: PurchaseRepository) {
    super();
    this.purchaseRepository = purchaseRepository;
  }

  /**
   * @param {Object} input
   * @param {number} input.supplier_id
   * @param {Array<{product_id:number, quantity:number, unit_price:number}>} input.items
   * @param {string} [input.notes]
   * @param {string|Date} [input.expected_date]
   * @param {number} input.userId - Id do usuário requisitante (`requester_id`).
   * @param {import('sequelize').Transaction} input.transaction - Transação Sequelize ativa (criada pelo controller).
   * @returns {Promise<Object>} Pedido de compra criado (sem includes; o controller busca a versão completa após o commit).
   * @throws {import('../../../../errors').ValidationError} Se os dados de entrada forem inválidos.
   * @throws {NotFoundError} Se algum `product_id` referenciado não existir.
   */
  async execute({ supplier_id, items, notes, expected_date, userId, transaction }: CreatePurchaseInput) {
    const entity = new PurchaseEntity({ supplier_id, items, notes, expected_date });

    let totalAmount = 0;
    for (const item of entity.items) {
      const qty = parseFloat(item.quantity);
      const unitPrice = parseFloat(item.unit_price);
      const product = await this.purchaseRepository.findProductById(item.product_id, transaction);
      if (!product) {
        throw new NotFoundError(`Produto ${item.product_id} não encontrado`);
      }
      totalAmount += qty * unitPrice;
    }

    const purchase = await this.purchaseRepository.createPurchase({
      order_number: `PO-${Date.now()}`,
      supplier_id: entity.supplier_id,
      requester_id: userId,
      total_amount: totalAmount,
      order_date: new Date(),
      expected_date: entity.expected_date || null,
      delivery_date: null,
      freight_type: null,
      freight_value: 0,
      status: 'pending',
      notes: entity.notes || null,
      invoice_number: null,
      invoice_date: null
    }, transaction);

    for (const item of entity.items) {
      const qty = parseFloat(item.quantity);
      const unitPrice = parseFloat(item.unit_price);
      const totalPrice = qty * unitPrice;
      await this.purchaseRepository.createPurchaseItem({
        purchase_id: purchase.id,
        product_id: item.product_id,
        quantity: qty,
        unit_price: unitPrice,
        total_price: totalPrice,
        status: 'pending'
      }, transaction);
    }

    return { purchase, totalAmount };
  }
}

module.exports = CreatePurchaseUseCase;


