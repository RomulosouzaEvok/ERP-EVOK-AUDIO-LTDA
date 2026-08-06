/**
 * Use case: cancelar uma ordem de manutenção.
 *
 * @module modules/maintenance/application/use-cases/CancelMaintenanceOrderUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../errors';
import MaintenanceRepository from '../../domain/repositories/MaintenanceRepository';
import { sequelize } from '../../../../config/database';

class CancelMaintenanceOrderUseCase extends UseCase<{ id: number | string }, { message: string }> {
  private readonly maintenanceRepository: MaintenanceRepository;

  /** @param maintenanceRepository - Repositorio de ordens de manutenção. */
  public constructor(maintenanceRepository: MaintenanceRepository) {
    super();
    this.maintenanceRepository = maintenanceRepository;
  }

  /**
   * @param input - Id da ordem de manutenção.
   * @returns Mensagem de confirmação.
   * @throws {NotFoundError} Se a ordem não existir.
   *
   * Sincronização `Asset.status`: assim como a conclusão em
   * `UpdateMaintenanceOrderUseCase`, o cancelamento tenta devolver o ativo
   * para `active`, mas só quando não há outra OM aberta para o mesmo ativo e
   * o ativo não foi baixado durante a manutenção (ver
   * `MaintenanceRepository.releaseAssetFromMaintenanceIfNoOtherOpenOrders`).
   */
  public async execute({ id }: { id: number | string }): Promise<{ message: string }> {
    const t = await sequelize.transaction();
    try {
      const order = await this.maintenanceRepository.findByIdForUpdate(id, t);
      if (!order) {
        throw new NotFoundError('Ordem de manutenção não encontrada');
      }

      await this.maintenanceRepository.update(id, { status: 'canceled' }, t);
      await this.maintenanceRepository.releaseAssetFromMaintenanceIfNoOtherOpenOrders(order.asset_id, id, t);

      await t.commit();
      return { message: 'Ordem de manutenção cancelada' };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
}

export = CancelMaintenanceOrderUseCase;
