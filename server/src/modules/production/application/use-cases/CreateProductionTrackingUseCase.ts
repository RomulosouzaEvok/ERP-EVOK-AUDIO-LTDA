/**
 * Use case: criar apontamento de etapa de OP.
 *
 * @module modules/production/application/use-cases/CreateProductionTrackingUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError, ValidationError } from '../../../../errors';
import { sequelize } from '../../../../config/database';

class CreateProductionTrackingUseCase extends UseCase<Record<string, any>, Promise<any>> {
  private readonly productionOrderRepository: any;

  /** @param productionOrderRepository - Repositorio de OP. */
  public constructor(productionOrderRepository: any) {
    super();
    this.productionOrderRepository = productionOrderRepository;
  }

  /**
   * Cria uma etapa manual de apontamento.
   *
   * @param input - Dados da etapa.
   * @returns Apontamento criado.
   * @throws {ValidationError} Se a sequencia for invalida.
   * @throws {NotFoundError} Se a OP nao existir.
   */
  public async execute(input: Record<string, any>): Promise<any> {
    const seq = parseInt(String(input.sequence), 10);
    if (!Number.isFinite(seq) || seq <= 0) throw new ValidationError('Sequencia da etapa deve ser maior que zero');

    const t = await sequelize.transaction();
    try {
      const order = await this.productionOrderRepository.findByIdForUpdate(input.production_order_id, t);
      if (!order) throw new NotFoundError('Ordem de producao nao encontrada');

      const tracking = await this.productionOrderRepository.createTracking({
        production_order_id: input.production_order_id,
        production_route_step_id: input.production_route_step_id || null,
        sequence: seq,
        status: 'pending',
        notes: input.notes || null
      }, t);

      await t.commit();
      return tracking;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
}

export = CreateProductionTrackingUseCase;
