const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError, BusinessRuleError } = require('../../../../errors');

/**
 * Inativa (soft delete) um produto, impedindo a operação caso existam
 * vendas ativas (status `confirmed`/`invoiced`) associadas a ele — mesma
 * regra do controller legado (`productController.remove`).
 */
class DeactivateProductUseCase extends UseCase {
  /**
   * @param {import('../../domain/repositories/ProductRepository')} productRepository
   */
  constructor(productRepository) {
    super();
    this.productRepository = productRepository;
  }

  /**
   * @param {Object} input
   * @param {number} input.id - Id do produto a inativar.
   * @returns {Promise<{ before: Object }>} Estado anterior do produto, útil para auditoria.
   * @throws {NotFoundError} Se o produto não existir.
   * @throws {BusinessRuleError} Se o produto possuir vendas ativas.
   */
  async execute({ id }) {
    const activeSales = await this.productRepository.countActiveSales(id);
    if (activeSales > 0) {
      throw new BusinessRuleError(`Produto possui ${activeSales} venda(s) ativa(s). Não pode ser inativado.`);
    }

    const before = await this.productRepository.findById(id, { withCategory: false });
    if (!before) throw new NotFoundError('Produto não encontrado');

    const updated = await this.productRepository.update(id, { status: 'inactive' });
    if (!updated) throw new NotFoundError('Produto não encontrado');

    return { before };
  }
}

module.exports = DeactivateProductUseCase;
