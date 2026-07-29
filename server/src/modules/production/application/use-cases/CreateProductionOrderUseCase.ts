/**
 * Use case: criar ordem de producao.
 *
 * @module modules/production/application/use-cases/CreateProductionOrderUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import ProductionOrderEntity from '../../domain/entities/ProductionOrderEntity';
import { NotFoundError, BusinessRuleError } from '../../../../errors';
import { sequelize } from '../../../../config/database';

class CreateProductionOrderUseCase extends UseCase<Record<string, any>, Promise<any>> {
  private readonly productionOrderRepository: any;

  /** @param productionOrderRepository - Repositorio de OP. */
  public constructor(productionOrderRepository: any) {
    super();
    this.productionOrderRepository = productionOrderRepository;
  }

  /**
   * Cria uma OP planejada com numeracao anual sequencial.
   *
   * @param input - Dados da OP.
   * @returns OP criada.
   * @throws {ValidationError} Se a entidade estiver invalida.
   * @throws {NotFoundError} Se o produto nao existir.
   * @throws {BusinessRuleError} Se o produto nao puder ser produzido.
   */
  public async execute(input: Record<string, any>): Promise<any> {
    const entity = new ProductionOrderEntity(input as any);
    const t = await sequelize.transaction();

    try {
      const product = await this.productionOrderRepository.findProductById(entity.product_id, t);
      if (!product) throw new NotFoundError('Produto nao encontrado');
      if (product.status !== 'active') throw new BusinessRuleError('Produto inativo nao pode ser produzido');
      if (product.product_type !== 'finished') {
        throw new BusinessRuleError(`Apenas produtos acabados tem OP. '${product.name}' e '${product.product_type}'`);
      }

      const year = new Date().getFullYear();
      const yearPrefix = `OP-${year}`;
      const count = await this.productionOrderRepository.countByOrderNumberPrefix(yearPrefix, t);
      const order_number = `${yearPrefix}-${String(count + 1).padStart(4, '0')}`;
      const order = await this.productionOrderRepository.create(
        entity.toCreatePersistence({ order_number, created_by: input.created_by ?? null }),
        t
      );

      await t.commit();
      return order;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
}

export = CreateProductionOrderUseCase;
