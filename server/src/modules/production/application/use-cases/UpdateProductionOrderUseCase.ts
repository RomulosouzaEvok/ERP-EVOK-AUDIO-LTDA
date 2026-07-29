/**
 * Use case: atualizar campos nao-status da OP.
 *
 * @module modules/production/application/use-cases/UpdateProductionOrderUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError, ValidationError } from '../../../../errors';

const ALLOWED_FIELDS = ['priority', 'due_date', 'responsible_id', 'notes'];

class UpdateProductionOrderUseCase extends UseCase<{ id: number; data: Record<string, any> }, Promise<any>> {
  private readonly productionOrderRepository: any;

  /** @param productionOrderRepository - Repositorio de OP. */
  public constructor(productionOrderRepository: any) {
    super();
    this.productionOrderRepository = productionOrderRepository;
  }

  /**
   * Atualiza campos permitidos da OP.
   *
   * @param input - ID e dados da requisicao.
   * @returns Estado anterior, campos aplicados e OP atualizada.
   * @throws {ValidationError} Se `status` for enviado no corpo.
   * @throws {NotFoundError} Se a OP nao existir.
   */
  public async execute(input: { id: number; data: Record<string, any> }): Promise<any> {
    if (input.data.status) throw new ValidationError('Use /:id/status para alterar status');

    const updateData: Record<string, any> = {};
    for (const field of ALLOWED_FIELDS) {
      if (input.data[field] !== undefined) updateData[field] = input.data[field];
    }

    const before = await this.productionOrderRepository.findRawById(input.id);
    if (!before) throw new NotFoundError('Ordem de producao nao encontrada');

    const updated = await this.productionOrderRepository.update(input.id, updateData);
    if (!updated) throw new NotFoundError('Ordem de producao nao encontrada');

    const order = await this.productionOrderRepository.findByIdWithProductSummary(input.id);
    return { before, updateData, order };
  }
}

export = UpdateProductionOrderUseCase;
