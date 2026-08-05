const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError, ConflictError, ValidationError } = require('../../../../errors');
import type { IProductRepository } from '../../domain/repositories/ProductRepository';

/** Campos aceitos no update, na mesma ordem/conjunto do controller anterior. */
const ALLOWED_FIELDS = ['name', 'description', 'category_id', 'price', 'cost_price', 'min_quantity', 'status', 'product_type', 'ncm', 'cest', 'weight', 'unit', 'lead_time', 'drawing_number', 'revision', 'location'];

/**
 * Atualiza um produto existente. Preserva o comportamento anterior de update
 * parcial (apenas campos presentes em `input` são alterados) e a regra de
 * preço de venda > preço de custo quando ambos são enviados juntos.
 *
 * Quando `revision` é alterada, retorna um indicador `isRevision` para que o
 * controller registre a auditoria com o texto "revisão X → Y", preservando o
 * comportamento anterior.
 */
class UpdateProductUseCase extends UseCase {
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
   * @param {number} input.id - Id do produto a atualizar.
   * @param {Object} input.body - Campos a atualizar (subconjunto de `ALLOWED_FIELDS`).
   * @returns {Promise<{ product: Object, oldValues: Object, updateData: Object, isRevision: boolean }>}
   * @throws {NotFoundError} Se o produto não existir.
   * @throws {ValidationError} Se preço de venda <= preço de custo quando ambos informados.
   * @throws {ConflictError} Se a atualização violar unicidade de código (propagado pelo Sequelize/controller).
   */
  async execute({ id, body }: { id: number | string; body: Record<string, unknown> }) {
    const updateData: any = {};
    for (const field of ALLOWED_FIELDS) {
      if (body[field] !== undefined) updateData[field] = body[field];
    }

    if (updateData.price !== undefined && updateData.cost_price !== undefined) {
      if (parseFloat(updateData.price) <= parseFloat(updateData.cost_price)) {
        throw new ValidationError('Preço de venda deve ser maior que o preço de custo');
      }
    }

    const before = await this.productRepository.findById(id, { withCategory: false });
    if (!before) throw new NotFoundError('Produto não encontrado');

    const oldValues: any = {};
    for (const field of Object.keys(updateData)) oldValues[field] = before[field];

    const isRevision = updateData.revision !== undefined && updateData.revision !== before.revision;

    const product = await this.productRepository.update(id, updateData);
    if (!product) throw new NotFoundError('Produto não encontrado');

    return { product, oldValues, updateData, isRevision, before };
  }
}

module.exports = UpdateProductUseCase;



