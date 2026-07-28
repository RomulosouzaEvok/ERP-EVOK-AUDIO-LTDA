const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError, ValidationError, BusinessRuleError } = require('../../../../errors');

/**
 * Máquina de estados de status do pedido de compra — single source of
 * truth, migrada 1:1 do controller legado
 * `server/src/controllers/purchaseController.js`.
 */
const VALID_TRANSITIONS = {
  pending: ['approved', 'canceled'],
  approved: ['sent', 'canceled'],
  sent: ['partial', 'received', 'canceled'],
  partial: ['received', 'canceled'],
  received: [],
  canceled: []
};

/**
 * Altera o status de um pedido de compra respeitando `VALID_TRANSITIONS` e,
 * ao transicionar para `approved`, gera a `AccountPayable` correspondente
 * (via `createPurchasePayable`), cobrindo o fluxo do endpoint
 * `PUT /api/purchases/:id/status`.
 *
 * Correção de bug pré-existente (documentada no README do módulo): o
 * controller legado chamava `createPurchasePayable` sem passar a
 * `transaction` do Sequelize (na verdade nem abria uma transaction em
 * `updateStatus`), então a mudança de status e a criação da conta a pagar
 * não eram atômicas. Aqui, o controller abre uma transaction e todo o
 * fluxo (busca, validação de transição, `save()` do status e criação da
 * `AccountPayable`) roda dentro dela.
 */
class ChangePurchaseStatusUseCase extends UseCase {
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
   * @param {string} input.status - Novo status desejado.
   * @param {number} input.userId - Id do usuário que aprova (usado em `AccountPayable.approved_by`).
   * @param {import('sequelize').Transaction} input.transaction - Transação Sequelize ativa (criada pelo controller).
   * @returns {Promise<{ purchase: Object, previousStatus: string }>}
   * @throws {ValidationError} Se `status` ausente, igual ao atual, ou transição inválida.
   * @throws {NotFoundError} Se o pedido não existir.
   */
  async execute({ id, status, userId, transaction }) {
    if (!status) {
      throw new ValidationError('Status é obrigatório');
    }

    const purchase = await this.purchaseRepository.findPurchaseByIdRaw(id, transaction);
    if (!purchase) {
      throw new NotFoundError('Pedido não encontrado');
    }
    if (purchase.status === status) {
      throw new ValidationError(`Pedido já está com status ${status}`);
    }

    const allowed = VALID_TRANSITIONS[purchase.status] || [];
    if (!allowed.includes(status)) {
      throw new BusinessRuleError(
        `Transição de status inválida: ${purchase.status} → ${status}. Permitidas: ${allowed.join(', ') || 'nenhuma'}`
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

  /**
   * Gera a `AccountPayable` referente ao pedido aprovado (idempotente: não
   * cria duplicata se já existir uma para o mesmo `purchase_id`). Lógica
   * migrada 1:1 do helper interno `createPurchasePayable` do controller
   * legado, agora sempre executada dentro de uma transaction.
   *
   * @param {Object} purchase - Instância Sequelize do pedido (já com `status = 'approved'`).
   * @param {number} userId - Id do usuário aprovador.
   * @param {import('sequelize').Transaction} transaction
   * @returns {Promise<void>}
   * @private
   */
  async _createPurchasePayable(purchase, userId, transaction) {
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
      status: 'pending',
      category: 'Fornecedores',
      supplier_id: purchase.supplier_id,
      purchase_id: purchase.id,
      approved_by: userId,
      approval_date: new Date(),
      notes: `Gerado automaticamente na aprovacao do pedido ${purchase.order_number}`
    }, transaction);
  }
}

module.exports = ChangePurchaseStatusUseCase;
module.exports.VALID_TRANSITIONS = VALID_TRANSITIONS;
