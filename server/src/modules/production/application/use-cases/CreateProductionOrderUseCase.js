const UseCase = require('../../../../shared/application/UseCase');
const ProductionOrderEntity = require('../../domain/entities/ProductionOrderEntity');
const { NotFoundError, BusinessRuleError } = require('../../../../errors');
const { sequelize } = require('../../../../config/database');

/**
 * Cria uma nova ordem de produção, cobrindo `POST /api/production-orders`.
 *
 * `ProductionOrderEntity` valida a FORMA dos dados de entrada
 * (`product_id`, `quantity > 0`, `due_date`). Este use case valida a regra
 * de negócio (produto deve existir, estar `active` e ser do tipo
 * `finished`), gera o número sequencial `OP-<ano>-XXXX` e persiste — tudo
 * dentro de uma transação Sequelize, exatamente como no controller legado.
 */
class CreateProductionOrderUseCase extends UseCase {
  /** @param {import('../../domain/repositories/ProductionOrderRepository')} productionOrderRepository */
  constructor(productionOrderRepository) {
    super();
    this.productionOrderRepository = productionOrderRepository;
  }

  /**
   * @param {Object} input
   * @param {number} input.product_id
   * @param {number} input.quantity
   * @param {string} [input.priority]
   * @param {string|Date} input.due_date
   * @param {number} [input.responsible_id]
   * @param {number} [input.sales_order_id]
   * @param {string} [input.notes]
   * @param {number} input.created_by - Id do usuário que está criando a OP.
   * @returns {Promise<Object>} A OP criada.
   * @throws {import('../../../../errors').ValidationError} Se os dados de entrada forem inválidos.
   * @throws {NotFoundError} Se o produto não existir.
   * @throws {BusinessRuleError} Se o produto estiver inativo ou não for do tipo `finished`.
   */
  async execute({ product_id, quantity, priority, due_date, responsible_id, sales_order_id, notes, created_by }) {
    const entity = new ProductionOrderEntity({ product_id, quantity, due_date, priority, responsible_id, sales_order_id, notes });

    const t = await sequelize.transaction();
    try {
      const product = await this.productionOrderRepository.findProductById(entity.product_id, t);
      if (!product) {
        throw new NotFoundError('Produto não encontrado');
      }
      if (product.status !== 'active') {
        throw new BusinessRuleError('Produto inativo não pode ser produzido');
      }
      if (product.product_type !== 'finished') {
        throw new BusinessRuleError(`Apenas produtos acabados têm OP. '${product.name}' é '${product.product_type}'`);
      }

      const year = new Date().getFullYear();
      const yearPrefix = `OP-${year}`;
      const count = await this.productionOrderRepository.countByOrderNumberPrefix(yearPrefix, t);
      const order_number = `${yearPrefix}-${String(count + 1).padStart(4, '0')}`;

      const order = await this.productionOrderRepository.create({
        order_number,
        product_id: entity.product_id,
        quantity: entity.quantity,
        priority: entity.priority || 'normal',
        status: 'planned',
        due_date: entity.due_date,
        sales_order_id: entity.sales_order_id,
        responsible_id: entity.responsible_id,
        notes: entity.notes,
        created_by
      }, t);

      await t.commit();
      return order;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
}

module.exports = CreateProductionOrderUseCase;
