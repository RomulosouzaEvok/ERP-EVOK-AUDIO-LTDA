/**
 * Caso de uso: listagem paginada de objetivos estratégicos, cobrindo
 * `GET /api/directorate/strategic-plannings`.
 *
 * @module modules/directorate/application/use-cases/strategic-planning/ListStrategicPlanningsUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import DirectorateRepository from '../../../domain/repositories/DirectorateRepository';

type ListStrategicPlanningsInput = {
  year?: number;
  directorate_id?: number;
  department_id?: number;
  status?: string;
  page?: number;
  limit?: number;
  offset: number;
};

class ListStrategicPlanningsUseCase extends UseCase<ListStrategicPlanningsInput, any> {
  private readonly directorateRepository: DirectorateRepository;

  constructor(directorateRepository: DirectorateRepository) {
    super();
    this.directorateRepository = directorateRepository;
  }

  async execute(input: ListStrategicPlanningsInput) {
    const page = input.page ?? 1;
    const limit = input.limit ?? 100;

    const { rows, count } = await this.directorateRepository.listStrategicPlannings(
      {
        year: input.year, directorate_id: input.directorate_id, department_id: input.department_id, status: input.status,
      },
      { limit, offset: input.offset },
    );

    return { rows, count, page, limit, totalPages: Math.max(1, Math.ceil(count / limit)) };
  }
}

export = ListStrategicPlanningsUseCase;
