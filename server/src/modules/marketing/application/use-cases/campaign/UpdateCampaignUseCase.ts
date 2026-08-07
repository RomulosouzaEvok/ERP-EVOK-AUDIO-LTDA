/**
 * Caso de uso: atualização de campanha de marketing, cobrindo o fluxo do
 * endpoint `PUT /api/marketing/campaigns/:id`.
 *
 * BLOCO 5 MKT (correção):
 * - Imutabilidade pós-conclusão (RF-MKT-034): quando `status` atual é
 *   `completed`/`canceled`, apenas `notes` é aceito — qualquer outra chave
 *   presente no payload (mesmo que igual ao valor atual) é rejeitada com
 *   422.
 * - Ativação exige orçamento aprovado (RF-MKT-031): `status='active'` só é
 *   aceito se `budget_approval_status` atual for `'approved'`.
 * - `leads_generated`/`conversions`/`roi` NUNCA chegam aqui — já são
 *   rejeitados na validação Zod (`updateCampaignSchema.strict()`,
 *   RF-MKT-006).
 *
 * @module modules/marketing/application/use-cases/campaign/UpdateCampaignUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError, ValidationError, BusinessRuleError } from '../../../../../errors';
import CampaignRepository from '../../../domain/repositories/CampaignRepository';

const IMMUTABLE_STATUSES = ['completed', 'canceled'];

type UpdateCampaignInput = { id: number } & Record<string, any>;

class UpdateCampaignUseCase extends UseCase<UpdateCampaignInput, any> {
  private readonly campaignRepository: CampaignRepository;

  constructor(campaignRepository: CampaignRepository) {
    super();
    this.campaignRepository = campaignRepository;
  }

  /**
   * @throws {NotFoundError} Se a campanha não existir.
   * @throws {ValidationError} Se `end_date` vier antes de `start_date`.
   * @throws {BusinessRuleError} Se a campanha estiver `completed`/`canceled` e o payload tiver chave além de `notes`; ou se `status='active'` for solicitado sem orçamento aprovado.
   */
  async execute({ id, ...rest }: UpdateCampaignInput) {
    const current = await this.campaignRepository.findCampaignById(id);
    if (!current) {
      throw new NotFoundError('Campanha não encontrada.');
    }

    if (IMMUTABLE_STATUSES.includes(current.status)) {
      const keys = Object.keys(rest);
      const onlyNotes = keys.length > 0 && keys.every((k) => k === 'notes');
      if (keys.length > 0 && !onlyNotes) {
        throw new BusinessRuleError(
          `Campanha '${current.status}' só permite editar o campo 'notes'.`
        );
      }
    }

    if (rest.status === 'active' && current.budget_approval_status !== 'approved') {
      throw new BusinessRuleError('Campanha não pode ser ativada sem orçamento aprovado.');
    }

    const startDate = rest.start_date ?? current.start_date;
    const endDate = rest.end_date !== undefined ? rest.end_date : current.end_date;
    if (endDate && new Date(endDate) < new Date(startDate)) {
      throw new ValidationError('end_date não pode ser anterior a start_date.');
    }

    return this.campaignRepository.updateCampaign(id, rest);
  }
}

export = UpdateCampaignUseCase;
