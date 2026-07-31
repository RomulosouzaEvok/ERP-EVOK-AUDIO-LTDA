const UseCase = require('../../../../shared/application/UseCase');
const { ValidationError } = require('../../../../errors');
const InventoryService = require('../../../../services/inventoryService');

/**
 * Registra uma movimentação manual de estoque (entrada/saída) para um
 * produto, preservando o comportamento do endpoint anterior
 * `POST /api/products/movements`.
 *
 * Corrigido (auditoria "pente fino"): antes lia `Product.quantity` e
 * escrevia de volta sem transação nem lock pessimista, permitindo que duas
 * requisições concorrentes de saída deixassem o estoque negativo (a mesma
 * classe de bug já corrigida em `/api/inventory/movements` via
 * `InventoryService`, mas que este endpoint mais antigo ainda tinha).
 * Agora delega inteiramente a `InventoryService.adjust`, que trava a linha
 * do produto (`SELECT ... FOR UPDATE`) dentro da transação fornecida pelo
 * controller, revalida estoque suficiente sob lock, e cria o
 * `InventoryMovement` atomicamente.
 */
class RegisterProductMovementUseCase extends UseCase {
  /**
   * @param {import('../../domain/repositories/ProductRepository')} productRepository - Mantido no construtor por compatibilidade, não usado neste fluxo (a leitura/escrita passa a ser feita via `InventoryService`, que já trava a linha).
   */
  constructor(productRepository) {
    super();
    this.productRepository = productRepository;
  }

  /**
   * @param {Object} input
   * @param {number} input.product_id
   * @param {'in'|'out'} input.type
   * @param {number} input.quantity
   * @param {string} [input.description]
   * @param {number} input.userId - Id do usuário que realizou a movimentação.
   * @param {import('sequelize').Transaction} input.transaction - Transação Sequelize ativa (aberta pelo controller).
   * @returns {Promise<{ movement: Object, product: Object, previousQuantity: number, newQuantity: number }>}
   * @throws {ValidationError} Se produto, tipo ou quantidade forem inválidos.
   * @throws {Error} Com `statusCode` 404/409 propagado de `InventoryService.adjust` se o produto não existir ou o estoque for insuficiente (revalidado sob lock).
   */
  async execute({ product_id, type, quantity, description, userId, transaction }) {
    if (!product_id || !type || !quantity) {
      throw new ValidationError('Produto, tipo e quantidade são obrigatórios');
    }
    if (quantity <= 0) {
      throw new ValidationError('Quantidade deve ser maior que zero');
    }

    const result = await InventoryService.adjust(
      product_id,
      type,
      quantity,
      userId,
      description || 'Movimentação manual',
      transaction
    );

    return {
      movement: { id: result.movementId },
      product: result.product,
      previousQuantity: result.quantityBefore,
      newQuantity: result.quantityAfter
    };
  }
}

module.exports = RegisterProductMovementUseCase;
