/**
 * Use case: buscar ordem de manutenção por id.
 *
 * @module modules/maintenance/application/use-cases/GetMaintenanceOrderByIdUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../errors';
import MaintenanceRepository from '../../domain/repositories/MaintenanceRepository';

class GetMaintenanceOrderByIdUseCase extends UseCase<{ id: number | string }, any> {
  private readonly maintenanceRepository: MaintenanceRepository;

  /** @param maintenanceRepository - Repositorio de ordens de manutenção. */
  public constructor(maintenanceRepository: MaintenanceRepository) {
    super();
    this.maintenanceRepository = maintenanceRepository;
  }

  /**
   * @param input - Id da ordem de manutenção.
   * @returns Ordem de manutenção encontrada.
   * @throws {NotFoundError} Se a ordem não existir.
   */
  public async execute({ id }: { id: number | string }): Promise<any> {
    const order = await this.maintenanceRepository.findById(id);
    if (!order) {
      throw new NotFoundError('Ordem de manutenção não encontrada');
    }
    return order;
  }
}

export = GetMaintenanceOrderByIdUseCase;
