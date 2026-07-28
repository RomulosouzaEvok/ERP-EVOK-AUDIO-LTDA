const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError, ValidationError, BusinessRuleError } = require('../../../../errors');
const { InventoryMovement } = require('../../../../models/index');

/**
 * Registra uma movimentação manual de estoque (entrada/saída) para um
 * produto, preservando o comportamento do endpoint legado
 * `POST /api/products/movements`.
 *
 * Observação: este use case ainda acessa o model `InventoryMovement`
 * diretamente e altera `Product.quantity` via update simples (sem lock
 * pessimista), pois a migração completa do domínio de Estoque (com
 * `InventoryService.consume/receive` transacional) é escopo da Fase 5/6 do
 * módulo `inventory`, ainda não migrado. Ver pendências no README do módulo.
 */
class RegisterProductMovementUseCase extends UseCase {
  /**
   * @param {import('../../domain/repositories/ProductRepository')} productRepository
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
   * @returns {Promise<{ movement: Object, product: Object, previousQuantity: number, newQuantity: number }>}
   * @throws {ValidationError} Se produto, tipo ou quantidade forem inválidos.
   * @throws {NotFoundError} Se o produto não existir.
   * @throws {BusinessRuleError} Se a saída exceder o estoque disponível.
   */
  async execute({ product_id, type, quantity, description, userId }) {
    if (!product_id || !type || !quantity) {
      throw new ValidationError('Produto, tipo e quantidade são obrigatórios');
    }
    if (quantity <= 0) {
      throw new ValidationError('Quantidade deve ser maior que zero');
    }

    const product = await this.productRepository.findById(product_id, { withCategory: false });
    if (!product) throw new NotFoundError('Produto não encontrado');

    if (type === 'out' && product.quantity < quantity) {
      throw new BusinessRuleError(`Estoque insuficiente. Disponível: ${product.quantity}, Solicitado: ${quantity}`);
    }

    const movement = await InventoryMovement.create({
      product_id,
      user_id: userId,
      type,
      quantity,
      description: description || 'Movimentação manual',
      reference_type: 'adjustment'
    });

    const previousQuantity = product.quantity;
    const newQuantity = product.quantity + (type === 'in' ? quantity : -quantity);
    await this.productRepository.update(product_id, { quantity: newQuantity });

    return { movement, product, previousQuantity, newQuantity };
  }
}

module.exports = RegisterProductMovementUseCase;
