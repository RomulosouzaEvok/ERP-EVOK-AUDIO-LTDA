const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError, BusinessRuleError } = require('../../../../errors');
import type { IProductRepository } from '../../domain/repositories/ProductRepository';

class DeactivateProductUseCase extends UseCase {
  private productRepository: IProductRepository;

  constructor(productRepository: IProductRepository) {
    super();
    this.productRepository = productRepository;
  }

  async execute({ id }: { id: number | string }) {
    const activeBomLinks = await this.productRepository.countActiveBomLinks(id);
    if (activeBomLinks > 0) {
      throw new BusinessRuleError(`Produto possui ${activeBomLinks} vinculo(s) ativo(s) em BOM. Nao pode ser inativado.`);
    }

    const activeSales = await this.productRepository.countActiveSales(id);
    if (activeSales > 0) {
      throw new BusinessRuleError(`Produto possui ${activeSales} venda(s) ativa(s). Nao pode ser inativado.`);
    }

    const before = await this.productRepository.findById(id, { withCategory: false });
    if (!before) throw new NotFoundError('Produto nao encontrado');

    const updated = await this.productRepository.update(id, { status: 'inactive' });
    if (!updated) throw new NotFoundError('Produto nao encontrado');

    return { before };
  }
}

module.exports = DeactivateProductUseCase;
