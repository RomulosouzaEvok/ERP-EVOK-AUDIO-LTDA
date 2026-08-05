const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError, ValidationError } = require('../../../../errors');
import type { IProductRepository } from '../../domain/repositories/ProductRepository';

/**
 * Registra uma nova revisão técnica para um produto (ex.: alteração de
 * desenho/projeto do alto-falante), atualizando o campo `revision`.
 *
 * Este use case isola o fluxo de revisão do update genérico
 * (`UpdateProductUseCase`), mesmo que hoje ambos compartilhem a mesma coluna
 * `revision` no model Sequelize — preparando o terreno para, no futuro,
 * a revisão evoluir para uma tabela de histórico própria sem afetar o update geral.
 */
class CreateProductRevisionUseCase extends UseCase {
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
   * @param {string} input.revision - Nova revisão técnica (ex.: "01").
   * @returns {Promise<{ product: Object, oldRevision: string, newRevision: string }>}
   * @throws {NotFoundError} Se o produto não existir.
   * @throws {ValidationError} Se `revision` for vazia ou igual à atual.
   */
  async execute({ id, revision }: { id: number | string; revision: string }) {
    if (!revision || String(revision).trim() === '') {
      throw new ValidationError('Nova revisão é obrigatória.');
    }
    const before = await this.productRepository.findById(id, { withCategory: false });
    if (!before) throw new NotFoundError('Produto não encontrado');
    if (revision === before.revision) {
      throw new ValidationError('A nova revisão deve ser diferente da revisão atual.');
    }

    const product = await this.productRepository.update(id, { revision });
    if (!product) throw new NotFoundError('Produto não encontrado');

    return { product, oldRevision: before.revision, newRevision: revision };
  }
}

module.exports = CreateProductRevisionUseCase;


