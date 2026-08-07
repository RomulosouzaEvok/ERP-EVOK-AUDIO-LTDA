/**
 * `GET /api/ti/licenses/:assetId/seats` — lista assentos alocados
 * (RF-TI-025).
 *
 * @module modules/ti/application/use-cases/license/ListLicenseSeatsUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import LicenseRepository from '../../../domain/repositories/LicenseRepository';
import { NotFoundError } from '../../../../../errors';
import { toSeatDTO } from '../../../infrastructure/mappers/LicenseMapper';

class ListLicenseSeatsUseCase extends UseCase<{ assetId: number }, any[]> {
  private readonly repository: LicenseRepository;

  public constructor(repository: LicenseRepository) {
    super();
    this.repository = repository;
  }

  /** @throws {NotFoundError} Licença não encontrada para o asset. */
  public async execute({ assetId }: { assetId: number }): Promise<any[]> {
    const detail = await this.repository.findByAssetId(assetId);
    if (!detail) throw new NotFoundError(`Licença do ativo ${assetId} não encontrada.`);
    const seats = await this.repository.listSeats(detail.id);
    return seats.map(toSeatDTO);
  }
}

export = ListLicenseSeatsUseCase;
