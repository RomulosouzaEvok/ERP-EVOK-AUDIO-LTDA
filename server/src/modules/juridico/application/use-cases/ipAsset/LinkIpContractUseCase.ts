/**
 * `POST /api/jur/ip-assets/:id/contracts` — vincula `Contrato` (N:N) ao
 * ativo de PI (RF-JUR-034) — NDA que protege segredo, licenciamento de
 * marca.
 *
 * @module modules/juridico/application/use-cases/ipAsset/LinkIpContractUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import IpAssetRepository from '../../../domain/repositories/IpAssetRepository';
import { ValidationError, NotFoundError, ConflictError } from '../../../../../errors';
import type { LinkIpContractInput } from '../../../domain/entities/IpAssetTypes';

class LinkIpContractUseCase extends UseCase<LinkIpContractInput, any> {
  private readonly repository: IpAssetRepository;

  public constructor(repository: IpAssetRepository) {
    super();
    this.repository = repository;
  }

  /**
   * @throws {ValidationError} `contract_id` ausente (400).
   * @throws {NotFoundError} Ativo de PI ou contrato não encontrado (404).
   * @throws {ConflictError} Par `(ip_id, contract_id)` já vinculado (409, `uq_jur_ip_contract_links_ip_contract`).
   */
  public async execute(input: LinkIpContractInput): Promise<any> {
    if (!input.contract_id) throw new ValidationError('contract_id é obrigatório.');

    const ipAsset = await this.repository.findById(input.ipId);
    if (!ipAsset) throw new NotFoundError(`Ativo de PI ${input.ipId} não encontrado.`);

    const { JurContract } = require('../../../../../models/index');
    const contract = await JurContract.findByPk(input.contract_id);
    if (!contract) throw new NotFoundError(`Contrato ${input.contract_id} não encontrado.`);

    try {
      return await this.repository.linkContract({
        ip_id: input.ipId,
        contract_id: input.contract_id,
        link_description: input.link_description ?? null,
      });
    } catch (error: any) {
      if (error?.name === 'SequelizeUniqueConstraintError') {
        throw new ConflictError('Este contrato já está vinculado a este ativo de PI.');
      }
      throw error;
    }
  }
}

export = LinkIpContractUseCase;
