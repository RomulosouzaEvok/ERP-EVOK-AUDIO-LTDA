/**
 * Use case: remover OP.
 *
 * @module modules/production/application/use-cases/RemoveProductionOrderUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError, BusinessRuleError } from '../../../../errors';

class RemoveProductionOrderUseCase extends UseCase<{ id: number }, Promise<any>> {
  private readonly productionOrderRepository: any;

  /** @param productionOrderRepository - Repositorio de OP. */
  public constructor(productionOrderRepository: any) {
    super();
    this.productionOrderRepository = productionOrderRepository;
  }

  /**
   * Remove uma OP quando seu status permite.
   *
   * @param input - ID da OP.
   * @returns OP removida no estado anterior.
   * @throws {NotFoundError} Se a OP nao existir.
   * @throws {BusinessRuleError} Se a OP estiver em andamento ou concluida.
   */
  public async execute(input: { id: number }): Promise<any> {
    const order = await this.productionOrderRepository.findRawById(input.id);
    if (!order) throw new NotFoundError('Ordem de producao nao encontrada');
    if (['in_progress', 'completed'].includes(order.status)) {
      throw new BusinessRuleError('Ordens em andamento ou concluidas nao podem ser removidas');
    }
    await this.productionOrderRepository.destroy(input.id);
    return order;
  }
}

export = RemoveProductionOrderUseCase;
