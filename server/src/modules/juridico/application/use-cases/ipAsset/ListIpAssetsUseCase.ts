/**
 * `GET /api/jur/ip-assets` — lista ativos de PI. `trade_secret` é excluído
 * do resultado para todo usuário com `role != 'admin'` (mesmo com módulo
 * `juridico:approve`) — §6.3, RF-JUR-033.
 *
 * @module modules/juridico/application/use-cases/ipAsset/ListIpAssetsUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import IpAssetRepository from '../../../domain/repositories/IpAssetRepository';
import type { ListIpAssetsInput } from '../../../domain/entities/IpAssetTypes';

class ListIpAssetsUseCase extends UseCase<ListIpAssetsInput, any> {
  private readonly repository: IpAssetRepository;

  public constructor(repository: IpAssetRepository) {
    super();
    this.repository = repository;
  }

  public async execute({ filters, page, limit, isAdmin }: ListIpAssetsInput): Promise<any> {
    const offset = (page - 1) * limit;
    const { count, rows } = await this.repository.findAndCount(filters, { limit, offset }, !isAdmin);
    return { rows, total: count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

export = ListIpAssetsUseCase;
