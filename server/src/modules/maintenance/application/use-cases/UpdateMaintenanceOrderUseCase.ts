/**
 * Use case: atualizar uma ordem de manutenção existente.
 *
 * @module modules/maintenance/application/use-cases/UpdateMaintenanceOrderUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../errors';
import MaintenanceRepository from '../../domain/repositories/MaintenanceRepository';

const ALLOWED_FIELDS = [
  'description',
  'diagnosis',
  'solution',
  'parts_used',
  'cost',
  'status',
  'priority',
  'maintenance_type',
  'technician_id',
  'start_date',
  'completion_date',
  'notes'
];

interface UpdateMaintenanceOrderInput {
  id: number | string;
  body: Record<string, unknown>;
}

class UpdateMaintenanceOrderUseCase extends UseCase<UpdateMaintenanceOrderInput, any> {
  private readonly maintenanceRepository: MaintenanceRepository;

  /** @param maintenanceRepository - Repositorio de ordens de manutenção. */
  public constructor(maintenanceRepository: MaintenanceRepository) {
    super();
    this.maintenanceRepository = maintenanceRepository;
  }

  /**
   * @param input - Id da ordem e campos a atualizar (apenas os permitidos).
   * @returns Ordem de manutenção atualizada.
   * @throws {NotFoundError} Se a ordem não existir.
   */
  public async execute({ id, body }: UpdateMaintenanceOrderInput): Promise<any> {
    const updateData: Record<string, unknown> = {};
    for (const field of ALLOWED_FIELDS) {
      if (body[field] !== undefined) updateData[field] = body[field];
    }
    if (body.status === 'in_progress' && !updateData.start_date) updateData.start_date = new Date();
    if (body.status === 'completed' && !updateData.completion_date) updateData.completion_date = new Date();

    const updated = await this.maintenanceRepository.update(id, updateData);
    if (!updated) {
      throw new NotFoundError('Ordem de manutenção não encontrada');
    }
    return this.maintenanceRepository.findById(id);
  }
}

export = UpdateMaintenanceOrderUseCase;
