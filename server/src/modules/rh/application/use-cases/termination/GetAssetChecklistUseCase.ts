/**
 * `GET /api/rh/termination-processes/:id/asset-checklist` — RF-RH-023.
 * Consulta `AssetService.listByResponsible` (read-only, Patrimônio).
 *
 * @module modules/rh/application/use-cases/termination/GetAssetChecklistUseCase
 */
import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../../errors';
import TerminationProcessRepository from '../../../domain/repositories/TerminationProcessRepository';
import AssetService from '../../../application/services/AssetService';

class GetAssetChecklistUseCase extends UseCase<{ id: number | string }, any> {
  private readonly repository: TerminationProcessRepository;
  private readonly assetService: AssetService;

  public constructor(repository: TerminationProcessRepository, assetService: AssetService) {
    super();
    this.repository = repository;
    this.assetService = assetService;
  }

  public async execute({ id }: { id: number | string }): Promise<any> {
    const process = await this.repository.findById(id);
    if (!process) throw new NotFoundError('Processo de demissão não encontrado.');
    const assets = await this.assetService.listByResponsible(Number(process.employee_id));
    return { pending: assets.some((asset) => !asset.returned), assets };
  }
}

export = GetAssetChecklistUseCase;
