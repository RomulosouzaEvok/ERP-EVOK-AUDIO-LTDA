/**
 * Use case: lista de bloqueio operacional (RF-SST-046) — funcionários cuja
 * função exige treinamento pela matriz mas cujo último registro está
 * vencido/inexistente. Consumida pelo módulo de Apontamento de Produção
 * (RNF-SST-06).
 *
 * @module modules/sst/application/use-cases/training/GetTrainingBlocklistUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import TrainingRepository from '../../../domain/repositories/TrainingRepository';

class GetTrainingBlocklistUseCase extends UseCase<void, any> {
  private readonly trainingRepository: TrainingRepository;

  public constructor(trainingRepository: TrainingRepository) {
    super();
    this.trainingRepository = trainingRepository;
  }

  public async execute(): Promise<any> {
    return this.trainingRepository.findBlocklist();
  }
}

export = GetTrainingBlocklistUseCase;
