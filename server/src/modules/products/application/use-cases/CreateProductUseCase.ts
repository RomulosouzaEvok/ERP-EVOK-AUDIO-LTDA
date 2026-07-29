const UseCase = require('../../../../shared/application/UseCase');
const { ConflictError, ValidationError } = require('../../../../errors');
const ProductEntity = require('../../domain/entities/ProductEntity');

/**
 * Cria um novo produto, validando as regras de domínio via `ProductEntity`
 * e garantindo unicidade de código a nível de repositório.
 */
class CreateProductUseCase extends UseCase {
  /**
   * @param {import('../../domain/repositories/ProductRepository')} productRepository
   */
  constructor(productRepository) {
    super();
    this.productRepository = productRepository;
  }

  /**
   * @param {Object} input - Dados de entrada equivalentes ao `req.body` do endpoint `POST /api/products`.
   * @returns {Promise<Object>} Registro de produto criado (Sequelize).
   * @throws {ValidationError} Se dados obrigatórios estiverem ausentes ou inválidos.
   * @throws {ConflictError} Se já existir um produto com o mesmo código.
   */
  async execute(input) {
    if (!input.name || !input.code || input.price === undefined || input.price === null) {
      throw new ValidationError('Nome, código e preço são obrigatórios');
    }

    const existing = await this.productRepository.findByCode(input.code);
    if (existing) throw new ConflictError('Código do produto já existe');

    const entity = new ProductEntity({
      name: input.name,
      code: input.code,
      description: input.description,
      category_id: input.category_id,
      price: parseFloat(input.price),
      cost_price: input.cost_price !== undefined ? parseFloat(input.cost_price) : 0,
      quantity: input.quantity || 0,
      min_quantity: input.min_quantity || 5,
      product_type: input.product_type || 'finished',
      ncm: input.ncm || '85182100',
      cest: input.cest,
      weight: input.weight,
      unit: input.unit,
      lead_time: input.lead_time,
      drawing_number: input.drawing_number,
      revision: input.revision,
      location: input.location,
      status: 'active',
      tsParams: input.tsParams || {}
    });

    return this.productRepository.create(entity.toPersistence());
  }
}

module.exports = CreateProductUseCase;


