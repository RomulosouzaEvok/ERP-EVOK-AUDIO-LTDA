const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError } = require('../../../../errors');
import type { IProductRepository } from '../../domain/repositories/ProductRepository';

/**
 * Busca um produto pelo id.
 */
class GetProductByIdUseCase extends UseCase {
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
   * @param {number} input.id
   * @returns {Promise<Object>} Registro de produto (Sequelize) encontrado.
   * @throws {NotFoundError} Se o produto não existir.
   */
  async execute({ id }: { id: number | string }) {
    const product = await this.productRepository.findById(id);
    if (!product) throw new NotFoundError('Produto não encontrado');
    return product;
  }
}

module.exports = GetProductByIdUseCase;


