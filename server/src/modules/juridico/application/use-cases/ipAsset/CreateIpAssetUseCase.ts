/**
 * `POST /api/jur/ip-assets` — cadastra ativo de Propriedade Intelectual
 * (RF-JUR-031). Cria alertas de renovação/anuidade por `type` (RF-JUR-032,
 * janelas parametrizáveis por ativo,
 * `[VERIFICAR COM ASSESSOR JURÍDICO DA EMPRESA]`): `trademark` → 12 meses
 * antes de `expiration_date`; `patent`/demais tipos com `next_annuity_date`
 * informado → alerta na própria data (a janela de antecedência exata fica
 * pendente de confirmação jurídica, nunca hard-coded além do already
 * documentado aqui).
 *
 * `trade_secret` NUNCA aceita `attachment_url` (RF-JUR-033/LPI art. 195,
 * XI-XII) — o conteúdo do segredo nunca é aceito neste payload nem em
 * nenhum outro campo do módulo.
 *
 * @module modules/juridico/application/use-cases/ipAsset/CreateIpAssetUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import IpAssetRepository from '../../../domain/repositories/IpAssetRepository';
import LegalAlertRepository from '../../../domain/repositories/LegalAlertRepository';
import { ValidationError, BusinessRuleError } from '../../../../../errors';
import type { CreateIpAssetInput } from '../../../domain/entities/IpAssetTypes';

const IP_TYPES = ['trademark', 'patent', 'utility_model', 'industrial_design', 'copyright', 'trade_secret'];

class CreateIpAssetUseCase extends UseCase<CreateIpAssetInput, any> {
  private readonly repository: IpAssetRepository;
  private readonly alertRepository: LegalAlertRepository;

  public constructor(repository: IpAssetRepository, alertRepository: LegalAlertRepository) {
    super();
    this.repository = repository;
    this.alertRepository = alertRepository;
  }

  /**
   * @throws {ValidationError} `type`/`responsible_user_id` ausentes ou `type` inválido (400).
   * @throws {BusinessRuleError} `attachment_url` informado com `type=trade_secret` (422, RF-JUR-033).
   */
  public async execute(input: CreateIpAssetInput): Promise<any> {
    if (!input.type || !IP_TYPES.includes(input.type)) {
      throw new ValidationError(`type deve ser um de: ${IP_TYPES.join(', ')}.`);
    }
    if (!input.responsible_user_id) {
      throw new ValidationError('responsible_user_id é obrigatório.');
    }
    if (input.type === 'trade_secret' && input.attachment_url) {
      throw new BusinessRuleError(
        'Ativo do tipo trade_secret nunca aceita anexo/arquivo — o conteúdo do segredo nunca é persistido (RF-JUR-033, LPI art. 195, XI-XII).',
        { field: 'attachment_url', rule: 'BR-JUR-031' },
      );
    }

    const title = (input.title ?? input.description ?? `${input.type} ${input.registration_number ?? ''}`).toString().slice(0, 200).trim();

    const ipAsset = await this.repository.create({
      ip_type: input.type,
      registration_number: input.registration_number ?? null,
      title,
      description: input.description ?? null,
      holding_area: input.holding_area ?? null,
      filing_date: input.filing_date ?? null,
      grant_date: input.grant_date ?? null,
      expiration_date: input.expiration_date ?? null,
      next_annuity_date: input.next_annuity_date ?? null,
      status: input.status ?? 'filed',
      responsible_user_id: input.responsible_user_id,
    });

    if (input.type === 'trademark' && input.expiration_date) {
      const dueDate = new Date(input.expiration_date);
      dueDate.setMonth(dueDate.getMonth() - 12);
      await this.alertRepository.create({
        origin_type: 'intellectual_property',
        origin_id: ipAsset.id,
        alert_subtype: 'renewal',
        due_date: dueDate.toISOString().slice(0, 10),
        recipient_user_id: input.responsible_user_id,
        status: 'pending',
      });
    } else if (input.next_annuity_date) {
      await this.alertRepository.create({
        origin_type: 'intellectual_property',
        origin_id: ipAsset.id,
        alert_subtype: 'annuity',
        due_date: input.next_annuity_date,
        recipient_user_id: input.responsible_user_id,
        status: 'pending',
      });
    }

    return ipAsset;
  }
}

export = CreateIpAssetUseCase;
