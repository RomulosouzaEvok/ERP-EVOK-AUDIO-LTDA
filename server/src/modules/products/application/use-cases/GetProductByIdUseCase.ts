const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError } = require('../../../../errors');

/**
 * Busca um produto pelo id.
 */
class GetProductByIdUseCase extends UseCase {
  /**
   * @param {import('../../domain/repositories/ProductRepository')} productRepository
   */
  constructor(productRepository) {
    super();
    this.productRepository = productRepository;
  }

  /**
   * @param {Object} input
   * @param {number} input.id
   * @returns {Promise<Object>} Registro de produto (Sequelize) encontrado.
   * @throws {NotFoundError} Se o produto não existir.
   */
  async execute({ id }) {
    const product = await this.productRepository.findById(id);
    if (!product) throw new NotFoundError('Produto não encontrado');
    return product;
  }
}

module.exports = GetProductByIdUseCase;


