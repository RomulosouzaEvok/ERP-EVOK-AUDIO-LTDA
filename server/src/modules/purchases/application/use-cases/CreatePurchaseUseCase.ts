import type { Transaction } from 'sequelize';
import type PurchaseRepository = require('../../domain/repositories/PurchaseRepository');

const UseCase = require('../../../../shared/application/UseCase');
const PurchaseEntity = require('../../domain/entities/PurchaseEntity');
const { NotFoundError, BusinessRuleError } = require('../../../../errors');
const {
  checkPurchaseOriginAgainstSupplier,
  PURCHASE_ORIGIN_MISMATCH_RULE,
} = require('../../domain/constants');

interface CreatePurchaseInput {
  supplier_id: number | string;
  items: Array<{ product_id: number | string; quantity: number | string; unit_price: number | string }>;
  notes?: string;
  expected_date?: string | Date;
  /** G11 — origem declarada da compra (`national` quando omitida). */
  origin?: string | null;
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
   * @param {string} [input.origin] - G11: `'national'` (padrão) ou `'import'`. Declarar `'national'` não escapa da alçada quando o fornecedor é estrangeiro: desde 2026-08-11 o pedido é **gravado** como `'import'` nesse caso (`suppliers.is_foreign` prevalece já na criação).
   * @param {number} input.userId - Id do usuário requisitante (`requester_id`).
   * @param {import('sequelize').Transaction} input.transaction - Transação Sequelize ativa (criada pelo controller).
   * @returns {Promise<Object>} Pedido de compra criado (sem includes; o controller busca a versão completa após o commit).
   * @throws {import('../../../../errors').ValidationError} Se os dados de entrada forem inválidos.
   * @throws {NotFoundError} Se o fornecedor ou algum `product_id` referenciado não existir.
   * @throws {import('../../../../errors').BusinessRuleError} 422 `G11-ORIGIN-SUPPLIER-MISMATCH` — `origin='import'` com fornecedor cadastrado como nacional.
   */
  async execute({ supplier_id, items, notes, expected_date, origin, userId, transaction }: CreatePurchaseInput) {
    const entity = new PurchaseEntity({ supplier_id, items, notes, expected_date, origin });

    // G11 (auditoria 2026-08-11) — a origem do pedido passa a ser conferida
    // contra o CADASTRO do fornecedor, e gravada já corrigida. Antes, a
    // resolução só acontecia na aprovação e o registro ficava com a origem
    // declarada, que podia contradizer `suppliers.is_foreign`.
    const supplier = await this.purchaseRepository.findSupplierByIdRaw(entity.supplier_id, transaction);
    if (!supplier) {
      throw new NotFoundError(`Fornecedor ${entity.supplier_id} não encontrado`);
    }

    const originCheck = checkPurchaseOriginAgainstSupplier(entity.origin, supplier.is_foreign);
    if (!originCheck.coherent) {
      throw new BusinessRuleError(
        `O pedido foi declarado como IMPORTAÇÃO, mas o fornecedor "${supplier.company_name ?? entity.supplier_id}" `
        + 'está cadastrado como NACIONAL (`is_foreign = false`). Um dos dois está errado: se ele é estrangeiro, '
        + 'marque-o como tal em Compras > Fornecedores (PUT /api/suppliers/:id) — é esse cadastro que faz TODA '
        + 'compra dele exigir a diretoria; se a compra não é importação, corrija a origem do pedido.',
        {
          rule: PURCHASE_ORIGIN_MISMATCH_RULE,
          supplier_id: supplier.id,
          supplier_is_foreign: supplier.is_foreign === true,
          declared_origin: entity.origin,
        },
      );
    }

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
      // G11: nunca `null` — a coluna e NOT NULL DEFAULT 'national' e a
      // entidade ja normaliza a ausencia para 'national'. Desde 2026-08-11
      // grava-se a origem EFETIVA (cadastro do fornecedor prevalece sobre a
      // declaracao), e nao a declarada: fornecedor estrangeiro nunca fica
      // registrado como compra nacional.
      origin: originCheck.effectiveOrigin,
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


