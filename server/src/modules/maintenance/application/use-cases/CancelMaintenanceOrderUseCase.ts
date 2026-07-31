/**
 * Use case: cancelar uma ordem de manutenção.
 *
 * @module modules/maintenance/application/use-cases/CancelMaintenanceOrderUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../errors';
import MaintenanceRepository from '../../domain/repositories/MaintenanceRepository';

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
   */
  public async execute({ id }: { id: number | string }): Promise<{ message: string }> {
    const updated = await this.maintenanceRepository.update(id, { status: 'canceled' });
    if (!updated) {
      throw new NotFoundError('Ordem de manutenção não encontrada');
    }
    return { message: 'Ordem de manutenção cancelada' };
  }
}

export = CancelMaintenanceOrderUseCase;
