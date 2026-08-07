/**
 * Use case: atualizar periodicidade/status de item da matriz de
 * treinamentos.
 *
 * @module modules/sst/application/use-cases/training/UpdateTrainingMatrixUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import TrainingRepository from '../../../domain/repositories/TrainingRepository';
import { NotFoundError } from '../../../../../errors';
import { fromMatrixInput, toMatrixDTO } from '../../../infrastructure/mappers/TrainingMapper';

interface UpdateTrainingMatrixInput {
  id: string | number;
  body: Record<string, any>;
}

class UpdateTrainingMatrixUseCase extends UseCase<UpdateTrainingMatrixInput, any> {
  private readonly trainingRepository: TrainingRepository;

  public constructor(trainingRepository: TrainingRepository) {
    super();
    this.trainingRepository = trainingRepository;
  }

  /** @throws {NotFoundError} Item não encontrado (404). */
  public async execute({ id, body }: UpdateTrainingMatrixInput): Promise<any> {
    const existente = await this.trainingRepository.findMatrixById(id);
    if (!existente) throw new NotFoundError('Item da matriz de treinamento não encontrado.');
    const atualizado = await this.trainingRepository.updateMatrixItem(id, fromMatrixInput(body));
    return toMatrixDTO(atualizado);
  }
}

export = UpdateTrainingMatrixUseCase;
