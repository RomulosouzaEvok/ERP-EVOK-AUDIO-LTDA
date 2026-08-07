/**
 * `GET /api/jur/ip-assets/:id` — detalhe. `role==='admin'` exclusivo se
 * `type=trade_secret` — 403 FORBIDDEN para qualquer outro usuário, mesmo
 * com `juridico:approve` (§6.3, RF-JUR-033).
 *
 * @module modules/juridico/application/use-cases/ipAsset/GetIpAssetByIdUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import IpAssetRepository from '../../../domain/repositories/IpAssetRepository';
import { NotFoundError, ForbiddenError } from '../../../../../errors';

interface GetIpAssetByIdInput {
  id: number | string;
  isAdmin: boolean;
}

class GetIpAssetByIdUseCase extends UseCase<GetIpAssetByIdInput, any> {
  private readonly repository: IpAssetRepository;

  public constructor(repository: IpAssetRepository) {
    super();
    this.repository = repository;
  }

  /**
   * @throws {NotFoundError} Ativo não encontrado (404).
   * @throws {ForbiddenError} `type=trade_secret` e `!isAdmin` (403).
   */
  public async execute({ id, isAdmin }: GetIpAssetByIdInput): Promise<any> {
    const ipAsset = await this.repository.findById(id);
    if (!ipAsset) throw new NotFoundError(`Ativo de PI ${id} não encontrado.`);

    if (ipAsset.ip_type === 'trade_secret' && !isAdmin) {
      throw new ForbiddenError(
        'Acesso a ativo de segredo industrial exige role=admin (RF-JUR-033).',
        { rule: 'RNF-JUR-01' },
      );
    }

    return ipAsset;
  }
}

export = GetIpAssetByIdUseCase;
