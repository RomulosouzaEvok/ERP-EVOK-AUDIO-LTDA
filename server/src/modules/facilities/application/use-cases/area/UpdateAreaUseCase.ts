/**
 * Caso de uso: atualização de uma área física, cobrindo o fluxo do
 * endpoint `PUT /api/facilities/areas/:id`.
 *
 * @module modules/facilities/application/use-cases/area/UpdateAreaUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../../errors';
import AreaRepository from '../../../domain/repositories/AreaRepository';

type UpdateAreaInput = { id: number } & Record<string, any>;

class UpdateAreaUseCase extends UseCase<UpdateAreaInput, any> {
  private readonly areaRepository: AreaRepository;

  constructor(areaRepository: AreaRepository) {
    super();
    this.areaRepository = areaRepository;
  }

  async execute({ id, ...rest }: UpdateAreaInput) {
    const current = await this.areaRepository.findAreaById(id);
    if (!current) {
      throw new NotFoundError('Área física não encontrada.');
    }

    return this.areaRepository.updateArea(id, rest);
  }
}

export = UpdateAreaUseCase;
