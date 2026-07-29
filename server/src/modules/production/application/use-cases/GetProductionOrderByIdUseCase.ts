/**
 * Use case: buscar OP por id.
 *
 * @module modules/production/application/use-cases/GetProductionOrderByIdUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../errors';

class GetProductionOrderByIdUseCase extends UseCase<{ id: number }, Promise<any>> {
  private readonly productionOrderRepository: any;

  /** @param productionOrderRepository - Repositorio de OP. */
  public constructor(productionOrderRepository: any) {
    super();
    this.productionOrderRepository = productionOrderRepository;
  }

  /**
   * Busca uma OP por id.
   *
   * @param input - ID da OP.
   * @returns OP encontrada.
   * @throws {NotFoundError} Se a OP nao existir.
   */
  public async execute(input: { id: number }): Promise<any> {
    const order = await this.productionOrderRepository.findById(input.id);
    if (!order) throw new NotFoundError('Ordem de producao nao encontrada');
    return order;
  }
}

export = GetProductionOrderByIdUseCase;
