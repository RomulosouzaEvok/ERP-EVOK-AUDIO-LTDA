/**
 * Use case: criar item da matriz de treinamentos (RF-SST-044).
 *
 * @module modules/sst/application/use-cases/training/CreateTrainingMatrixUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import TrainingRepository from '../../../domain/repositories/TrainingRepository';
import { ValidationError, ConflictError } from '../../../../../errors';
import { fromMatrixInput, toMatrixDTO } from '../../../infrastructure/mappers/TrainingMapper';

interface CreateTrainingMatrixInput {
  body: Record<string, any>;
}

class CreateTrainingMatrixUseCase extends UseCase<CreateTrainingMatrixInput, any> {
  private readonly trainingRepository: TrainingRepository;

  public constructor(trainingRepository: TrainingRepository) {
    super();
    this.trainingRepository = trainingRepository;
  }

  /**
   * @throws {ValidationError} `position`/`norma` ausentes (400).
   * @throws {ConflictError} Já existe item da matriz para o par `position`/`norma` (409 — UNIQUE).
   */
  public async execute({ body }: CreateTrainingMatrixInput): Promise<any> {
    if (!body.position || !body.norma) throw new ValidationError('position e norma são obrigatórios.');
    const existente = await this.trainingRepository.findMatrixByPositionAndNorma(body.position, body.norma);
    if (existente) throw new ConflictError('Já existe item da matriz de treinamento para esta função e norma.');

    const item = await this.trainingRepository.createMatrixItem(fromMatrixInput(body));
    return toMatrixDTO(item);
  }
}

export = CreateTrainingMatrixUseCase;
