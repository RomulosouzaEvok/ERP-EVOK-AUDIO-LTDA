/**
 * `PUT /api/ti/licenses/:assetId` — atualiza fornecedor/seats/custo/ciclo
 * (RF-TI-024).
 *
 * @module modules/ti/application/use-cases/license/UpdateLicenseDetailUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import LicenseRepository from '../../../domain/repositories/LicenseRepository';
import { NotFoundError } from '../../../../../errors';
import type { UpdateLicenseDetailInput } from '../../../domain/entities/LicenseTypes';
import { toLicenseDTO } from '../../../infrastructure/mappers/LicenseMapper';

class UpdateLicenseDetailUseCase extends UseCase<UpdateLicenseDetailInput, any> {
  private readonly repository: LicenseRepository;

  public constructor(repository: LicenseRepository) {
    super();
    this.repository = repository;
  }

  /** @throws {NotFoundError} Extensão de licença não encontrada para o asset. */
  public async execute({ assetId, ...data }: UpdateLicenseDetailInput): Promise<any> {
    const updated = await this.repository.updateLicenseDetail(assetId, data);
    if (!updated) throw new NotFoundError(`Licença do ativo ${assetId} não encontrada.`);
    const seatsAllocated = await this.repository.countActiveSeats(updated.id);
    return toLicenseDTO(await this.repository.findByAssetId(assetId), seatsAllocated);
  }
}

export = UpdateLicenseDetailUseCase;
