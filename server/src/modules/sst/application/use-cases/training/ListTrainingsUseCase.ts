/**
 * Use case: listar TreinamentoSST (realizações).
 *
 * @module modules/sst/application/use-cases/training/ListTrainingsUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import TrainingRepository from '../../../domain/repositories/TrainingRepository';
import { toTrainingDTO } from '../../../infrastructure/mappers/TrainingMapper';

class ListTrainingsUseCase extends UseCase<Record<string, any>, any> {
  private readonly trainingRepository: TrainingRepository;

  public constructor(trainingRepository: TrainingRepository) {
    super();
    this.trainingRepository = trainingRepository;
  }

  /** @param input - Filtros (`employee_id`, `norma`, `vencido`) e paginação. */
  public async execute(input: Record<string, any>) {
    const { page = '1', limit = '20', ...filters } = input;
    const p = parseInt(String(page), 10);
    const l = parseInt(String(limit), 10);
    const { count, rows } = await this.trainingRepository.findTrainingsAndCount(filters, { limit: l, offset: (p - 1) * l });
    return { rows: rows.map(toTrainingDTO), total: count, page: p, limit: l, totalPages: Math.ceil(count / l) };
  }
}

export = ListTrainingsUseCase;
