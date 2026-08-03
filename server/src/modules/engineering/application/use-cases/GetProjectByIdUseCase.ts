/**
 * Caso de uso: busca de um projeto de engenharia por id.
 *
 * @module modules/engineering/application/use-cases/GetProjectByIdUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../errors';
import EngineeringRepository from '../../domain/repositories/EngineeringRepository';

type GetProjectByIdInput = { id: number };

class GetProjectByIdUseCase extends UseCase<GetProjectByIdInput, any> {
  private readonly engineeringRepository: EngineeringRepository;

  constructor(engineeringRepository: EngineeringRepository) {
    super();
    this.engineeringRepository = engineeringRepository;
  }

  async execute({ id }: GetProjectByIdInput) {
    const project = await this.engineeringRepository.findProjectById(id);
    if (!project) {
      throw new NotFoundError('Projeto de engenharia nao encontrado.');
    }
    return project;
  }
}

export = GetProjectByIdUseCase;
