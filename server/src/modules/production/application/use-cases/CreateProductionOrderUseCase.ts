/**
 * Use case: criar ordem de producao.
 *
 * @module modules/production/application/use-cases/CreateProductionOrderUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import ProductionOrderEntity from '../../domain/entities/ProductionOrderEntity';
import { NotFoundError, BusinessRuleError } from '../../../../errors';
const BomService: any = require('../../../../services/bomService');
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

      const availability = await BomService.checkAvailability(entity.product_id, entity.quantity);
      if (!availability.available) {
        throw new BusinessRuleError(
          `Nao e possivel criar a OP sem material minimo disponivel para ${product.name}.`,
          {
            product_id: entity.product_id,
            requested_quantity: entity.quantity,
            max_possible_quantity: availability.max_possible_quantity,
            missing_items: availability.missing_items
          }
        );
      }

      // Numeracao serializada no repositorio (advisory lock por ano + MAX do
      // sufixo). Ate 2026-08-09 o numero era montado aqui com `COUNT(*) + 1`
      // sem nenhuma serializacao: duas criacoes concorrentes liam a mesma
      // contagem e geravam o mesmo `order_number` (UNIQUE, 500 em runtime), e
      // a contagem ainda regredia quando uma OP era removida, reemitindo um
      // numero ja usado (gap G16 da auditoria da cadeia do produto).
      const yearPrefix = `OP-${new Date().getFullYear()}`;
      const order_number = await this.productionOrderRepository.nextOrderNumberForYear(yearPrefix, t);
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
