import type { Transaction } from 'sequelize';
import type PurchaseRepository = require('../../domain/repositories/PurchaseRepository');

const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError, ValidationError, BusinessRuleError } = require('../../../../errors');

/**
 * Maquina de estados de status do pedido de compra.
 */
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['approved', 'canceled'],
  approved: ['sent', 'canceled'],
  sent: ['partial', 'received', 'canceled'],
  partial: ['received', 'canceled'],
  received: [],
  canceled: []
};

interface ChangePurchaseStatusInput {
  id: number | string;
  status: string;
  userId: number;
  transaction: Transaction;
}

class ChangePurchaseStatusUseCase extends UseCase {
  private purchaseRepository: PurchaseRepository;

  /**
   * @param {import('../../domain/repositories/PurchaseRepository')} purchaseRepository
   */
  constructor(purchaseRepository: PurchaseRepository) {
    super();
    this.purchaseRepository = purchaseRepository;
  }

  /**
   * @param {Object} input
   * @param {number} input.id
   * @param {string} input.status
   * @param {number} input.userId
   * @param {import('sequelize').Transaction} input.transaction
   * @returns {Promise<{ purchase: Object, previousStatus: string }>}
   */
  async execute({ id, status, userId, transaction }: ChangePurchaseStatusInput) {
    if (!status) {
      throw new ValidationError('Status e obrigatorio');
    }

    const purchase = await this.purchaseRepository.findPurchaseByIdRawForUpdate(id, transaction);
    if (!purchase) {
      throw new NotFoundError('Pedido nao encontrado');
    }
    if (purchase.status === status) {
      throw new ValidationError(`Pedido ja esta com status ${status}`);
    }

    const allowed = VALID_TRANSITIONS[purchase.status] || [];
    if (!allowed.includes(status)) {
      throw new BusinessRuleError(
        `Transicao de status invalida: ${purchase.status} -> ${status}. Permitidas: ${allowed.join(', ') || 'nenhuma'}`
      );
    }

    const previousStatus = purchase.status;
    purchase.status = status;
    await purchase.save({ transaction });

    if (status === 'approved') {
      await this._createPurchasePayable(purchase, userId, transaction);
    }

    return { purchase, previousStatus };
  }

  async _createPurchasePayable(purchase: any, userId: number, transaction: Transaction) {
    if (!purchase.supplier_id) return;

    const totalPayable = parseFloat(purchase.total_amount) || 0;
    if (totalPayable <= 0) return;

    const existingPayable = await this.purchaseRepository.findAccountPayableByPurchaseId(purchase.id, transaction);
    if (existingPayable) return;

    const dueDate = purchase.expected_date
      ? new Date(new Date(purchase.expected_date).getTime() + 30 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await this.purchaseRepository.createAccountPayable({
      description: `Fornecimento PO ${purchase.order_number}`,
      amount: totalPayable,
      due_date: dueDate.toISOString().slice(0, 10),
      payment_date: null,
      status: 'pending',
      category: 'Fornecedores',
      supplier_id: purchase.supplier_id,
      purchase_id: purchase.id,
      invoice_number: null,
      barcode: null,
      payment_type: null,
      cost_center: null,
      approved_by: userId,
      approval_date: new Date(),
      notes: `Gerado automaticamente na aprovacao do pedido ${purchase.order_number}`
    }, transaction);
  }
}

module.exports = ChangePurchaseStatusUseCase;
module.exports.VALID_TRANSITIONS = VALID_TRANSITIONS;
