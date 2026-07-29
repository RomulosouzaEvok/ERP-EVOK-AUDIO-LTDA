/**
 * Use case: listar apontamentos de uma OP.
 *
 * @module modules/production/application/use-cases/ListProductionTrackingUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../errors';

class ListProductionTrackingUseCase extends UseCase<{ production_order_id: number }, Promise<any[]>> {
  private readonly productionOrderRepository: any;

  /** @param productionOrderRepository - Repositorio de OP. */
  public constructor(productionOrderRepository: any) {
    super();
    this.productionOrderRepository = productionOrderRepository;
  }

  /**
   * Lista os apontamentos da OP.
   *
   * @param input - ID da OP.
   * @returns Lista de etapas/apontamentos.
   * @throws {NotFoundError} Se a OP nao existir.
   */
  public async execute(input: { production_order_id: number }): Promise<any[]> {
    const order = await this.productionOrderRepository.findRawById(input.production_order_id);
    if (!order) throw new NotFoundError('Ordem de producao nao encontrada');
    return this.productionOrderRepository.listTrackingByOrder(input.production_order_id);
  }
}

export = ListProductionTrackingUseCase;
