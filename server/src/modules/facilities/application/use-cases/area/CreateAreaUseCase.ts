/**
 * Caso de uso: criação de área física, cobrindo o fluxo do endpoint
 * `POST /api/facilities/areas`.
 *
 * @module modules/facilities/application/use-cases/area/CreateAreaUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import AreaRepository from '../../../domain/repositories/AreaRepository';

type CreateAreaInput = Record<string, any>;

class CreateAreaUseCase extends UseCase<CreateAreaInput, any> {
  private readonly areaRepository: AreaRepository;

  constructor(areaRepository: AreaRepository) {
    super();
    this.areaRepository = areaRepository;
  }

  async execute(input: CreateAreaInput) {
    return this.areaRepository.createArea(input);
  }
}

export = CreateAreaUseCase;
