/**
 * Use case: listar a matriz de treinamentos (função × norma × periodicidade).
 *
 * @module modules/sst/application/use-cases/training/ListTrainingMatrixUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import TrainingRepository from '../../../domain/repositories/TrainingRepository';
import { toMatrixDTO } from '../../../infrastructure/mappers/TrainingMapper';

class ListTrainingMatrixUseCase extends UseCase<Record<string, any>, any> {
  private readonly trainingRepository: TrainingRepository;

  public constructor(trainingRepository: TrainingRepository) {
    super();
    this.trainingRepository = trainingRepository;
  }

  public async execute(input: Record<string, any>) {
    const { page = '1', limit = '20', ...filters } = input;
    const p = parseInt(String(page), 10);
    const l = parseInt(String(limit), 10);
    const { count, rows } = await this.trainingRepository.findMatrixAndCount(filters, { limit: l, offset: (p - 1) * l });
    return { rows: rows.map(toMatrixDTO), total: count, page: p, limit: l, totalPages: Math.ceil(count / l) };
  }
}

export = ListTrainingMatrixUseCase;
