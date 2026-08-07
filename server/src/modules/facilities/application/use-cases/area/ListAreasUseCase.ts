/**
 * Caso de uso: listagem paginada de áreas físicas, cobrindo o fluxo do
 * endpoint `GET /api/facilities/areas`.
 *
 * @module modules/facilities/application/use-cases/area/ListAreasUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import AreaRepository from '../../../domain/repositories/AreaRepository';

type ListAreasInput = { area_type?: string; department_id?: number; page?: number; limit?: number; offset?: number };

class ListAreasUseCase extends UseCase<ListAreasInput, any> {
  private readonly areaRepository: AreaRepository;

  constructor(areaRepository: AreaRepository) {
    super();
    this.areaRepository = areaRepository;
  }

  async execute({ area_type, department_id, page = 1, limit = 20, offset = 0 }: ListAreasInput = {}) {
    const { rows, count } = await this.areaRepository.listAreas({ area_type, department_id }, { limit, offset });
    return { rows, count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

export = ListAreasUseCase;
