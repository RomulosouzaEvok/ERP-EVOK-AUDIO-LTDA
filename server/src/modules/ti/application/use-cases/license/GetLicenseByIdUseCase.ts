/**
 * `GET /api/ti/licenses/:assetId` — detalhe (com `license_key` mascarada
 * por padrão, RF-TI-027).
 *
 * @module modules/ti/application/use-cases/license/GetLicenseByIdUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import LicenseRepository from '../../../domain/repositories/LicenseRepository';
import { NotFoundError } from '../../../../../errors';
import { toLicenseDTO } from '../../../infrastructure/mappers/LicenseMapper';

class GetLicenseByIdUseCase extends UseCase<{ assetId: number }, any> {
  private readonly repository: LicenseRepository;

  public constructor(repository: LicenseRepository) {
    super();
    this.repository = repository;
  }

  /** @throws {NotFoundError} Licença não encontrada para o asset. */
  public async execute({ assetId }: { assetId: number }): Promise<any> {
    const detail = await this.repository.findByAssetId(assetId);
    if (!detail) throw new NotFoundError(`Licença do ativo ${assetId} não encontrada.`);
    const seatsAllocated = await this.repository.countActiveSeats(detail.id);
    return toLicenseDTO(detail, seatsAllocated);
  }
}

export = GetLicenseByIdUseCase;
