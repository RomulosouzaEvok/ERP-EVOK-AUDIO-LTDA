const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError, BusinessRuleError } = require('../../../../errors');

/** Campos editáveis de um pedido de compra (mesmo conjunto do controller legado). */
const ALLOWED_FIELDS = ['expected_date', 'freight_type', 'freight_value', 'notes', 'supplier_id'];

/**
 * Atualiza campos permitidos de um pedido de compra, cobrindo o fluxo do
 * endpoint `PUT /api/purchases/:id`.
 *
 * Apenas pedidos `pending` ou `approved` podem ser editados — mesma regra
 * do controller legado.
 */
class UpdatePurchaseUseCase extends UseCase {
  /**
   * @param {import('../../domain/repositories/PurchaseRepository')} purchaseRepository
   */
  constructor(purchaseRepository) {
    super();
    this.purchaseRepository = purchaseRepository;
  }

  /**
   * @param {Object} input
   * @param {number} input.id
   * @param {Object} input.body - Corpo da requisição; apenas os campos em `ALLOWED_FIELDS` são considerados.
   * @returns {Promise<{ updated: Object, oldValues: Object, updateData: Object }>}
   * @throws {NotFoundError} Se o pedido não existir.
   * @throws {BusinessRuleError} Se o pedido não estiver em `pending`/`approved`.
   */
  async execute({ id, body }) {
    const purchase = await this.purchaseRepository.findPurchaseByIdRaw(id);
    if (!purchase) {
      throw new NotFoundError('Pedido não encontrado');
    }
    if (!['pending', 'approved'].includes(purchase.status)) {
      throw new BusinessRuleError('Apenas pedidos pendentes ou aprovados podem ser editados');
    }

    const updateData = {};
    for (const field of ALLOWED_FIELDS) {
      if (body[field] !== undefined) updateData[field] = body[field];
    }
    const oldValues = {};
    for (const field of Object.keys(updateData)) oldValues[field] = purchase[field];

    await this.purchaseRepository.updatePurchaseFields(id, updateData);
    const updated = await this.purchaseRepository.findPurchaseById(id);

    return { updated, oldValues, updateData };
  }
}

module.exports = UpdatePurchaseUseCase;
