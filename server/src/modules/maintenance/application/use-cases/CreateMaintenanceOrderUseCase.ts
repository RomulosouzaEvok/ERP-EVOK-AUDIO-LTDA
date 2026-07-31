/**
 * Use case: criar uma nova ordem de manutenção.
 *
 * @module modules/maintenance/application/use-cases/CreateMaintenanceOrderUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { ValidationError } from '../../../../errors';
import MaintenanceRepository from '../../domain/repositories/MaintenanceRepository';

interface CreateMaintenanceOrderInput {
  asset_id?: number;
  description?: string;
  priority?: string;
  maintenance_type?: string;
  reportedBy: number;
}

class CreateMaintenanceOrderUseCase extends UseCase<CreateMaintenanceOrderInput, any> {
  private readonly maintenanceRepository: MaintenanceRepository;

  /** @param maintenanceRepository - Repositorio de ordens de manutenção. */
  public constructor(maintenanceRepository: MaintenanceRepository) {
    super();
    this.maintenanceRepository = maintenanceRepository;
  }

  /**
   * @param input - Dados da ordem (asset_id e description obrigatórios) e id do usuário autenticado.
   * @returns Ordem de manutenção criada.
   * @throws {ValidationError} Se `asset_id` ou `description` estiverem ausentes.
   */
  public async execute(input: CreateMaintenanceOrderInput): Promise<any> {
    const { asset_id, description, priority, maintenance_type, reportedBy } = input;
    if (!asset_id || !description) {
      throw new ValidationError('Ativo e descrição são obrigatórios');
    }
    return this.maintenanceRepository.create({
      asset_id,
      description,
      priority: priority || 'medium',
      maintenance_type: maintenance_type || 'corrective',
      reported_by: reportedBy,
      status: 'open'
    });
  }
}

export = CreateMaintenanceOrderUseCase;
