/**
 * Caso de uso: criação de programação de limpeza, cobrindo o fluxo do
 * endpoint `POST /api/facilities/cleaning-schedules`.
 *
 * @module modules/facilities/application/use-cases/cleaningSchedule/CreateCleaningScheduleUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import CleaningScheduleRepository from '../../../domain/repositories/CleaningScheduleRepository';

type CreateCleaningScheduleInput = Record<string, any>;

class CreateCleaningScheduleUseCase extends UseCase<CreateCleaningScheduleInput, any> {
  private readonly cleaningScheduleRepository: CleaningScheduleRepository;

  constructor(cleaningScheduleRepository: CleaningScheduleRepository) {
    super();
    this.cleaningScheduleRepository = cleaningScheduleRepository;
  }

  async execute(input: CreateCleaningScheduleInput) {
    return this.cleaningScheduleRepository.createCleaningSchedule(input);
  }
}

export = CreateCleaningScheduleUseCase;
