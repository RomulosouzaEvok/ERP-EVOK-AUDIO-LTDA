/**
 * Caso de uso: busca de um risco corporativo por id, cobrindo
 * `GET /api/directorate/business-risks/:id`.
 *
 * @module modules/directorate/application/use-cases/business-risk/GetBusinessRiskByIdUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../../errors';
import DirectorateRepository from '../../../domain/repositories/DirectorateRepository';

class GetBusinessRiskByIdUseCase extends UseCase<{ id: number }, any> {
  private readonly directorateRepository: DirectorateRepository;

  constructor(directorateRepository: DirectorateRepository) {
    super();
    this.directorateRepository = directorateRepository;
  }

  /** @throws {NotFoundError} Risco inexistente. */
  async execute(input: { id: number }) {
    const risk = await this.directorateRepository.findBusinessRiskById(input.id);
    if (!risk) {
      throw new NotFoundError(`Risco corporativo #${input.id} não encontrado.`);
    }
    return risk;
  }
}

export = GetBusinessRiskByIdUseCase;
