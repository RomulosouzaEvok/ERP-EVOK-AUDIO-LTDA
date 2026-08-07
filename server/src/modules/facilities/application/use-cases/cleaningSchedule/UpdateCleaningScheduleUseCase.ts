/**
 * Caso de uso: atualização de uma programação de limpeza, cobrindo o fluxo
 * do endpoint `PUT /api/facilities/cleaning-schedules/:id`.
 *
 * @module modules/facilities/application/use-cases/cleaningSchedule/UpdateCleaningScheduleUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../../errors';
import CleaningScheduleRepository from '../../../domain/repositories/CleaningScheduleRepository';

type UpdateCleaningScheduleInput = { id: number } & Record<string, any>;

class UpdateCleaningScheduleUseCase extends UseCase<UpdateCleaningScheduleInput, any> {
  private readonly cleaningScheduleRepository: CleaningScheduleRepository;

  constructor(cleaningScheduleRepository: CleaningScheduleRepository) {
    super();
    this.cleaningScheduleRepository = cleaningScheduleRepository;
  }

  async execute({ id, ...rest }: UpdateCleaningScheduleInput) {
    const current = await this.cleaningScheduleRepository.findCleaningScheduleById(id);
    if (!current) {
      throw new NotFoundError('Programação de limpeza não encontrada.');
    }

    return this.cleaningScheduleRepository.updateCleaningSchedule(id, rest);
  }
}

export = UpdateCleaningScheduleUseCase;
