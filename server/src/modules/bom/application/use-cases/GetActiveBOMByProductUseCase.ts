const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError } = require('../../../../errors');

/**
 * Busca a BOM ativa de um produto, cobrindo
 * `GET /api/engineering/bom/product/:productId`.
 */
class GetActiveBOMByProductUseCase extends UseCase {
  /** @param {import('../../domain/repositories/BOMRepository')} bomRepository */
  constructor(bomRepository) {
    super();
    this.bomRepository = bomRepository;
  }

  /**
   * @param {Object} input
   * @param {number} input.productId - Id do produto.
   * @returns {Promise<Object>} BOM ativa do produto.
   * @throws {NotFoundError} Se o produto não existir ou não possuir BOM ativa.
   */
  async execute({ productId }) {
    const product = await this.bomRepository.findProductById(productId);
    if (!product) {
      throw new NotFoundError('Produto não encontrado');
    }

    const bom = await this.bomRepository.findActiveByProduct(productId);
    if (!bom) {
      throw new NotFoundError(`Produto "${product.name}" não possui BOM ativa. Crie uma pelo POST /api/engineering/bom`);
    }

    return bom;
  }
}

module.exports = GetActiveBOMByProductUseCase;


