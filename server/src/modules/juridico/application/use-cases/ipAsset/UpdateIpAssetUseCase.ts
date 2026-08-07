/**
 * `PUT /api/jur/ip-assets/:id` — atualiza datas/status/responsável
 * (RF-JUR-031). Mesma trava de `trade_secret` sem `attachment_url` do
 * `CreateIpAssetUseCase` (RF-JUR-033).
 *
 * @module modules/juridico/application/use-cases/ipAsset/UpdateIpAssetUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import IpAssetRepository from '../../../domain/repositories/IpAssetRepository';
import { NotFoundError, BusinessRuleError } from '../../../../../errors';
import type { UpdateIpAssetInput } from '../../../domain/entities/IpAssetTypes';

class UpdateIpAssetUseCase extends UseCase<UpdateIpAssetInput, any> {
  private readonly repository: IpAssetRepository;

  public constructor(repository: IpAssetRepository) {
    super();
    this.repository = repository;
  }

  /**
   * @throws {NotFoundError} Ativo não encontrado (404).
   * @throws {BusinessRuleError} `attachment_url` informado com `type=trade_secret` (422).
   */
  public async execute(input: UpdateIpAssetInput): Promise<any> {
    const { id, ...rest } = input;
    const current = await this.repository.findById(id);
    if (!current) throw new NotFoundError(`Ativo de PI ${id} não encontrado.`);

    const resultingType = (rest as any).type ?? current.ip_type;
    if (resultingType === 'trade_secret' && (rest as any).attachment_url) {
      throw new BusinessRuleError(
        'Ativo do tipo trade_secret nunca aceita anexo/arquivo (RF-JUR-033).',
        { field: 'attachment_url', rule: 'BR-JUR-031' },
      );
    }

    const data: Record<string, unknown> = {};
    if ('type' in rest) data.ip_type = (rest as any).type;
    if ('title' in rest) data.title = (rest as any).title;
    if ('registration_number' in rest) data.registration_number = (rest as any).registration_number;
    if ('description' in rest) data.description = (rest as any).description;
    if ('holding_area' in rest) data.holding_area = (rest as any).holding_area;
    if ('filing_date' in rest) data.filing_date = (rest as any).filing_date;
    if ('grant_date' in rest) data.grant_date = (rest as any).grant_date;
    if ('expiration_date' in rest) data.expiration_date = (rest as any).expiration_date;
    if ('next_annuity_date' in rest) data.next_annuity_date = (rest as any).next_annuity_date;
    if ('status' in rest) data.status = (rest as any).status;
    if ('responsible_user_id' in rest) data.responsible_user_id = (rest as any).responsible_user_id;

    return this.repository.update(id, data);
  }
}

export = UpdateIpAssetUseCase;
