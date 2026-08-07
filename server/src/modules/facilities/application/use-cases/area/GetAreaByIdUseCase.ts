/**
 * Caso de uso: busca de uma área física por id, cobrindo o fluxo do
 * endpoint `GET /api/facilities/areas/:id`.
 *
 * @module modules/facilities/application/use-cases/area/GetAreaByIdUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../../errors';
import AreaRepository from '../../../domain/repositories/AreaRepository';

type GetAreaByIdInput = { id: number };

class GetAreaByIdUseCase extends UseCase<GetAreaByIdInput, any> {
  private readonly areaRepository: AreaRepository;

  constructor(areaRepository: AreaRepository) {
    super();
    this.areaRepository = areaRepository;
  }

  async execute({ id }: GetAreaByIdInput) {
    const area = await this.areaRepository.findAreaById(id);
    if (!area) {
      throw new NotFoundError('Área física não encontrada.');
    }
    return area;
  }
}

export = GetAreaByIdUseCase;
