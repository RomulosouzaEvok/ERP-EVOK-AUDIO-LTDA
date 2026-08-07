/**
 * `DELETE /api/ti/licenses/:assetId/seats/:seatId` — revoga assento
 * (`revoked_at`, sem hard delete de linha, RF-TI-025).
 *
 * @module modules/ti/application/use-cases/license/RevokeSeatUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import LicenseRepository from '../../../domain/repositories/LicenseRepository';
import { NotFoundError } from '../../../../../errors';
import { toSeatDTO } from '../../../infrastructure/mappers/LicenseMapper';

class RevokeSeatUseCase extends UseCase<{ seatId: number }, any> {
  private readonly repository: LicenseRepository;

  public constructor(repository: LicenseRepository) {
    super();
    this.repository = repository;
  }

  /** @throws {NotFoundError} Assento não encontrado. */
  public async execute({ seatId }: { seatId: number }): Promise<any> {
    const seat = await this.repository.findSeatById(seatId);
    if (!seat) throw new NotFoundError(`Assento de licença ${seatId} não encontrado.`);
    const revoked = await this.repository.revokeSeat(seatId);
    return toSeatDTO(revoked);
  }
}

export = RevokeSeatUseCase;
