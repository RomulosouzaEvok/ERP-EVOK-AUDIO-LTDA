/**
 * Caso de uso: listagem paginada de programações de limpeza, cobrindo o
 * fluxo do endpoint `GET /api/facilities/cleaning-schedules`.
 *
 * @module modules/facilities/application/use-cases/cleaningSchedule/ListCleaningSchedulesUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import CleaningScheduleRepository from '../../../domain/repositories/CleaningScheduleRepository';

type ListCleaningSchedulesInput = { frequency?: string; page?: number; limit?: number; offset?: number };

class ListCleaningSchedulesUseCase extends UseCase<ListCleaningSchedulesInput, any> {
  private readonly cleaningScheduleRepository: CleaningScheduleRepository;

  constructor(cleaningScheduleRepository: CleaningScheduleRepository) {
    super();
    this.cleaningScheduleRepository = cleaningScheduleRepository;
  }

  async execute({ frequency, page = 1, limit = 20, offset = 0 }: ListCleaningSchedulesInput = {}) {
    const { rows, count } = await this.cleaningScheduleRepository.listCleaningSchedules({ frequency }, { limit, offset });
    return { rows, count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

export = ListCleaningSchedulesUseCase;
