/**
 * Caso de uso: busca de uma ata de reunião por id, cobrindo
 * `GET /api/directorate/meeting-minutes/:id`.
 *
 * @module modules/directorate/application/use-cases/meeting-minute/GetMeetingMinuteByIdUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../../errors';
import DirectorateRepository from '../../../domain/repositories/DirectorateRepository';

class GetMeetingMinuteByIdUseCase extends UseCase<{ id: number }, any> {
  private readonly directorateRepository: DirectorateRepository;

  constructor(directorateRepository: DirectorateRepository) {
    super();
    this.directorateRepository = directorateRepository;
  }

  /** @throws {NotFoundError} Ata inexistente. */
  async execute(input: { id: number }) {
    const minute = await this.directorateRepository.findMeetingMinuteById(input.id);
    if (!minute) {
      throw new NotFoundError(`Ata #${input.id} não encontrada.`);
    }
    return minute;
  }
}

export = GetMeetingMinuteByIdUseCase;
