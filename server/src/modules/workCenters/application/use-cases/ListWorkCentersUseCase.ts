/**
 * Caso de uso: listagem paginada de centros de trabalho, com turnos incluidos.
 *
 * @module modules/workCenters/application/use-cases/ListWorkCentersUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import WorkCenterRepository from '../../domain/repositories/WorkCenterRepository';

type ListWorkCentersInput = {
  active?: boolean;
  page?: number;
  limit?: number;
  offset?: number;
};

type ListWorkCentersOutput = {
  rows: any[];
  count: number;
  page: number;
  limit: number;
  totalPages: number;
};

class ListWorkCentersUseCase extends UseCase<ListWorkCentersInput, ListWorkCentersOutput> {
  private readonly workCenterRepository: WorkCenterRepository;

  constructor(workCenterRepository: WorkCenterRepository) {
    super();
    this.workCenterRepository = workCenterRepository;
  }

  async execute({ active, page = 1, limit = 20, offset = 0 }: ListWorkCentersInput = {}) {
    const { rows, count } = await this.workCenterRepository.listWorkCenters(
      { active },
      { limit, offset }
    );
    return { rows, count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

export = ListWorkCentersUseCase;
