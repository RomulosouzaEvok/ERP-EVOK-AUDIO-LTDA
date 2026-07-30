/**
 * Use case: concluir apontamento de producao.
 *
 * @module modules/production/application/use-cases/CompleteProductionTrackingUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError, ValidationError, BusinessRuleError } from '../../../../errors';
import { sequelize } from '../../../../config/database';

class CompleteProductionTrackingUseCase extends UseCase<Record<string, any>, Promise<any>> {
  private readonly productionOrderRepository: any;

  /** @param productionOrderRepository - Repositorio de OP. */
  public constructor(productionOrderRepository: any) {
    super();
    this.productionOrderRepository = productionOrderRepository;
  }

  /**
   * Conclui uma etapa em andamento.
   *
   * @param input - ID da etapa, quantidades e observacoes.
   * @returns Etapa atualizada.
   * @throws {ValidationError} Se quantidades forem negativas.
   * @throws {NotFoundError} Se a etapa nao existir.
   * @throws {BusinessRuleError} Se a etapa nao estiver em andamento.
   */
  public async execute(input: Record<string, any>): Promise<any> {
    const good = parseFloat(String(input.quantity_good ?? 0));
    const scrapped = parseFloat(String(input.quantity_scrapped ?? 0));
    if (good < 0 || scrapped < 0) throw new ValidationError('Quantidades boa/refugada nao podem ser negativas');

    const t = await sequelize.transaction();
    try {
      const tracking = await this.productionOrderRepository.findTrackingByIdForUpdate(input.tracking_id, t);
      if (!tracking) throw new NotFoundError('Etapa de producao nao encontrada');
      if (tracking.status !== 'in_progress') {
        throw new BusinessRuleError(`Etapa em status ${tracking.status} nao pode ser concluida`);
      }

      await this.productionOrderRepository.updateTracking(input.tracking_id, {
        status: 'completed',
        finished_at: new Date(),
        quantity_good: good,
        quantity_scrapped: scrapped,
        notes: input.notes !== undefined ? input.notes : tracking.notes
      }, t);

      await t.commit();
      return this.productionOrderRepository.findTrackingById(input.tracking_id);
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
}

export = CompleteProductionTrackingUseCase;
