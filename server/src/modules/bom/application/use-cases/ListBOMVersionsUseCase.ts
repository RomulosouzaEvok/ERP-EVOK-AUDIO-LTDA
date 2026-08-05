const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError } = require('../../../../errors');
import type { IBOMRepository } from '../../domain/repositories/BOMRepository';

/**
 * Lista todas as versões (qualquer status: draft/active/inactive/superseded)
 * de BOM de um produto, ordenadas por data de criação. Cobre o endpoint
 * NOVO E ADITIVO `GET /api/engineering/bom/product/:productId/versions`
 * (não existia antes desta migração).
 */
class ListBOMVersionsUseCase extends UseCase {
  private bomRepository: IBOMRepository;

  /** @param {IBOMRepository} bomRepository */
  constructor(bomRepository: IBOMRepository) {
    super();
    this.bomRepository = bomRepository;
  }

  /**
   * @param {Object} input
   * @param {number} input.productId - Id do produto.
   * @returns {Promise<Object[]>} Lista de BOMs (todas as versões) do produto.
   * @throws {NotFoundError} Se o produto não existir.
   */
  async execute({ productId }: { productId: number }) {
    const product = await this.bomRepository.findProductById(productId);
    if (!product) {
      throw new NotFoundError('Produto não encontrado');
    }

    return this.bomRepository.listVersionsByProduct(productId);
  }
}

module.exports = ListBOMVersionsUseCase;


