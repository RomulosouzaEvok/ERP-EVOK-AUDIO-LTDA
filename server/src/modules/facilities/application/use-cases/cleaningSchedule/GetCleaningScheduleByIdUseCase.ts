/**
 * Caso de uso: busca de uma programação de limpeza por id, cobrindo o
 * fluxo do endpoint `GET /api/facilities/cleaning-schedules/:id`.
 *
 * @module modules/facilities/application/use-cases/cleaningSchedule/GetCleaningScheduleByIdUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../../errors';
import CleaningScheduleRepository from '../../../domain/repositories/CleaningScheduleRepository';

type GetCleaningScheduleByIdInput = { id: number };

class GetCleaningScheduleByIdUseCase extends UseCase<GetCleaningScheduleByIdInput, any> {
  private readonly cleaningScheduleRepository: CleaningScheduleRepository;

  constructor(cleaningScheduleRepository: CleaningScheduleRepository) {
    super();
    this.cleaningScheduleRepository = cleaningScheduleRepository;
  }

  async execute({ id }: GetCleaningScheduleByIdInput) {
    const schedule = await this.cleaningScheduleRepository.findCleaningScheduleById(id);
    if (!schedule) {
      throw new NotFoundError('Programação de limpeza não encontrada.');
    }
    return schedule;
  }
}

export = GetCleaningScheduleByIdUseCase;
