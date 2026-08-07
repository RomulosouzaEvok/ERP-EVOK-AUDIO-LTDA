/**
 * `GET /api/jur/ip-assets/:id/contracts` — lista contratos vinculados ao
 * ativo de PI (RF-JUR-034).
 *
 * @module modules/juridico/application/use-cases/ipAsset/ListIpContractLinksUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import IpAssetRepository from '../../../domain/repositories/IpAssetRepository';
import { NotFoundError } from '../../../../../errors';

class ListIpContractLinksUseCase extends UseCase<{ ipId: number | string }, any[]> {
  private readonly repository: IpAssetRepository;

  public constructor(repository: IpAssetRepository) {
    super();
    this.repository = repository;
  }

  /** @throws {NotFoundError} Ativo de PI não encontrado (404). */
  public async execute({ ipId }: { ipId: number | string }): Promise<any[]> {
    const ipAsset = await this.repository.findById(ipId);
    if (!ipAsset) throw new NotFoundError(`Ativo de PI ${ipId} não encontrado.`);

    return this.repository.listContractLinks(ipId);
  }
}

export = ListIpContractLinksUseCase;
