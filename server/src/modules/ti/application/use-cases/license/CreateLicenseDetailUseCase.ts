/**
 * `POST /api/ti/licenses` — cria extensão `ItSoftwareLicenseDetail` para
 * um `asset_id` já existente (`asset_type='license'`) — RF-TI-024,
 * BR-TI-008.
 *
 * @module modules/ti/application/use-cases/license/CreateLicenseDetailUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import LicenseRepository from '../../../domain/repositories/LicenseRepository';
import AssetLookupService from '../../../application/services/AssetLookupService';
import { ValidationError, NotFoundError, ConflictError } from '../../../../../errors';
import type { CreateLicenseDetailInput } from '../../../domain/entities/LicenseTypes';
import { toLicenseDTO } from '../../../infrastructure/mappers/LicenseMapper';

class CreateLicenseDetailUseCase extends UseCase<CreateLicenseDetailInput, any> {
  private readonly repository: LicenseRepository;
  private readonly assetLookupService: AssetLookupService;

  public constructor(repository: LicenseRepository, assetLookupService: AssetLookupService) {
    super();
    this.repository = repository;
    this.assetLookupService = assetLookupService;
  }

  /**
   * @throws {ValidationError} `asset_id` não tem `asset_type='license'`.
   * @throws {NotFoundError} `asset_id` não existe.
   * @throws {ConflictError} Já existe `ItSoftwareLicenseDetail` para o asset.
   */
  public async execute(input: CreateLicenseDetailInput): Promise<any> {
    if (!input.asset_id || !input.license_type) throw new ValidationError('asset_id e license_type são obrigatórios.');

    const asset = await this.assetLookupService.findById(input.asset_id);
    if (!asset) throw new NotFoundError(`Ativo ${input.asset_id} não encontrado.`);
    if (asset.asset_type !== 'license') {
      throw new ValidationError(`O ativo ${input.asset_id} não é do tipo "license" — cadastre-o como licença em /api/assets antes de criar a extensão.`);
    }

    const existing = await this.repository.findByAssetId(input.asset_id);
    if (existing) throw new ConflictError(`Já existe uma extensão de licença cadastrada para o ativo ${input.asset_id}.`);

    const created = await this.repository.createLicenseDetail({
      asset_id: input.asset_id,
      license_type: input.license_type,
      vendor: input.vendor ?? null,
      seats: input.seats ?? 1,
      license_key: input.license_key ?? null,
      cost: input.cost ?? null,
      billing_cycle: input.billing_cycle ?? 'one_time',
      renewal_date: input.renewal_date ?? null,
    });

    return toLicenseDTO(await this.repository.findByAssetId(created.asset_id), 0);
  }
}

export = CreateLicenseDetailUseCase;
