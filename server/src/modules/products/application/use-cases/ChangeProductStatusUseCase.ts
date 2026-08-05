const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError, ValidationError } = require('../../../../errors');
const { PRODUCT_STATUSES } = require('../../domain/entities/ProductEntity');
import type { IProductRepository } from '../../domain/repositories/ProductRepository';

/**
 * Altera o status (`active`/`inactive`) de um produto diretamente, sem a
 * checagem de vendas ativas aplicada por `DeactivateProductUseCase`. Útil
 * para reativação (`inactive` → `active`) ou para fluxos administrativos
 * que já tenham validado a transição por outro meio.
 */
class ChangeProductStatusUseCase extends UseCase {
  private productRepository: IProductRepository;

  /**
   * @param {IProductRepository} productRepository
   */
  constructor(productRepository: IProductRepository) {
    super();
    this.productRepository = productRepository;
  }

  /**
   * @param {Object} input
   * @param {number} input.id - Id do produto.
   * @param {string} input.status - Novo status (`active` | `inactive`).
   * @returns {Promise<{ product: Object, before: Object }>}
   * @throws {NotFoundError} Se o produto não existir.
   * @throws {ValidationError} Se `status` não for um valor suportado.
   */
  async execute({ id, status }: { id: number | string; status: string }) {
    if (!PRODUCT_STATUSES.includes(status)) {
      throw new ValidationError(`Status inválido. Valores aceitos: ${PRODUCT_STATUSES.join(', ')}.`);
    }
    const before = await this.productRepository.findById(id, { withCategory: false });
    if (!before) throw new NotFoundError('Produto não encontrado');

    const product = await this.productRepository.update(id, { status });
    if (!product) throw new NotFoundError('Produto não encontrado');

    return { product, before };
  }
}

module.exports = ChangeProductStatusUseCase;


