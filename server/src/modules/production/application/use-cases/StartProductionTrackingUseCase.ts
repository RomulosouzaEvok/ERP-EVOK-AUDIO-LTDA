/**
 * Use case: iniciar apontamento de producao.
 *
 * @module modules/production/application/use-cases/StartProductionTrackingUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError, BusinessRuleError } from '../../../../errors';
import { sequelize } from '../../../../config/database';

class StartProductionTrackingUseCase extends UseCase<{ tracking_id: number; operator_id?: number }, Promise<any>> {
  private readonly productionOrderRepository: any;

  /** @param productionOrderRepository - Repositorio de OP. */
  public constructor(productionOrderRepository: any) {
    super();
    this.productionOrderRepository = productionOrderRepository;
  }

  /**
   * Inicia uma etapa pendente ou pausada.
   *
   * @param input - ID da etapa e operador.
   * @returns Etapa atualizada.
   * @throws {NotFoundError} Se a etapa nao existir.
   * @throws {BusinessRuleError} Se a etapa nao puder ser iniciada.
   */
  public async execute(input: { tracking_id: number; operator_id?: number }): Promise<any> {
    const t = await sequelize.transaction();
    try {
      const tracking = await this.productionOrderRepository.findTrackingByIdForUpdate(input.tracking_id, t);
      if (!tracking) throw new NotFoundError('Etapa de producao nao encontrada');
      if (!['pending', 'paused'].includes(tracking.status)) {
        throw new BusinessRuleError(`Etapa em status ${tracking.status} nao pode ser iniciada`);
      }

      await this.productionOrderRepository.updateTracking(input.tracking_id, {
        status: 'in_progress',
        started_at: tracking.started_at || new Date(),
        operator_id: input.operator_id
      }, t);

      await t.commit();
      return this.productionOrderRepository.findTrackingById(input.tracking_id);
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
}

export = StartProductionTrackingUseCase;
