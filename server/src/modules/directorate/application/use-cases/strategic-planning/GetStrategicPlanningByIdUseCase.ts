/**
 * Caso de uso: busca de um objetivo estratégico por id, cobrindo
 * `GET /api/directorate/strategic-plannings/:id`.
 *
 * @module modules/directorate/application/use-cases/strategic-planning/GetStrategicPlanningByIdUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../../errors';
import DirectorateRepository from '../../../domain/repositories/DirectorateRepository';

class GetStrategicPlanningByIdUseCase extends UseCase<{ id: number }, any> {
  private readonly directorateRepository: DirectorateRepository;

  constructor(directorateRepository: DirectorateRepository) {
    super();
    this.directorateRepository = directorateRepository;
  }

  /** @throws {NotFoundError} Objetivo inexistente. */
  async execute(input: { id: number }) {
    const planning = await this.directorateRepository.findStrategicPlanningById(input.id);
    if (!planning) {
      throw new NotFoundError(`Objetivo estratégico #${input.id} não encontrado.`);
    }
    return planning;
  }
}

export = GetStrategicPlanningByIdUseCase;
