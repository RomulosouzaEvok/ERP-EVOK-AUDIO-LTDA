const UseCase = require('../../../../shared/application/UseCase');
const { ConflictError, ValidationError } = require('../../../../errors');
const ProductEntity = require('../../domain/entities/ProductEntity');
import type { IProductRepository } from '../../domain/repositories/ProductRepository';

/** Payload de entrada aceito por {@link CreateProductUseCase.execute} (equivalente ao `req.body` de `POST /api/products`). */
interface CreateProductInput {
  name: string;
  code: string;
  description?: string;
  category_id?: number;
  price: number | string;
  cost_price?: number | string;
  quantity?: number | string;
  min_quantity?: number | string;
  product_type?: string;
  ncm?: string;
  cest?: string;
  weight?: number | string;
  unit?: string;
  lead_time?: number;
  drawing_number?: string;
  revision?: string;
  location?: string;
  tsParams?: Record<string, unknown>;
}

/**
 * Cria um novo produto, validando as regras de domínio via `ProductEntity`
 * e garantindo unicidade de código a nível de repositório.
 *
 * Nota do diagnóstico do catálogo duplo (2026-08-12): o espelhamento
 * automático é UNIDIRECIONAL (item→produto, ver
 * `services/itemProductMirrorService.ts`) — esta porta NÃO cria item gêmeo.
 * Produto criado aqui sem item correspondente fica invisível na projeção de
 * estrutura do MRP (`bomStructureProjection.ts`, aresta `unmapped`); o
 * caminho canônico de cadastro é o Item Mestre (`POST /api/items`), que
 * adota um produto pré-existente de mesmo código como gêmeo. Órfãos legados
 * são fechados pelo backfill (`ensureItemMirrorForProduct`).
 */
class CreateProductUseCase extends UseCase {
  private productRepository: IProductRepository;

  /**
   * @param {IProductRepository} productRepository
   */
  constructor(productRepository: IProductRepository) {
    super();
    this.productRepository = productRepository;
  }

  /**
   * @param {Object} input - Dados de entrada equivalentes ao `req.body` do endpoint `POST /api/products`.
   * @returns {Promise<Object>} Registro de produto criado (Sequelize).
   * @throws {ValidationError} Se dados obrigatórios estiverem ausentes ou inválidos.
   * @throws {ConflictError} Se já existir um produto com o mesmo código.
   */
  async execute(input: CreateProductInput) {
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
      price: parseFloat(String(input.price)),
      cost_price: input.cost_price !== undefined ? parseFloat(String(input.cost_price)) : 0,
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


