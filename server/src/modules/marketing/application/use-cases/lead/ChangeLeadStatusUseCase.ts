/**
 * Caso de uso: avanço do lead no funil de marketing, cobrindo o fluxo do
 * endpoint dedicado `POST /api/marketing/leads/:id/status` (não um `PUT`
 * genérico irrestrito — mesmo espírito de `ChangeSaleStatusUseCase`, porém
 * bem mais simples: é só um funil, sem efeitos colaterais de estoque/
 * financeiro).
 *
 * @module modules/marketing/application/use-cases/lead/ChangeLeadStatusUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError, ValidationError, BusinessRuleError } from '../../../../../errors';
import LeadRepository from '../../../domain/repositories/LeadRepository';
import CampaignRepository from '../../../domain/repositories/CampaignRepository';

/**
 * Funil de leads: `new -> contacted -> qualified -> converted/lost`.
 * `lost` pode ser atingido a partir de qualquer etapa aberta (desistência
 * pode acontecer em qualquer ponto do funil). `converted`/`lost` são
 * terminais. Transições não listadas (ex. pular etapa, voltar etapa) são
 * bloqueadas com 422 — funil simples, sem necessidade de reabertura.
 */
const VALID_TRANSITIONS: Record<string, string[]> = {
  new: ['contacted', 'lost'],
  contacted: ['qualified', 'lost'],
  qualified: ['converted', 'lost'],
  converted: [],
  lost: [],
};

type ChangeLeadStatusInput = {
  id: number;
  status: string;
  converted_to_customer_id?: number;
};

class ChangeLeadStatusUseCase extends UseCase<ChangeLeadStatusInput, any> {
  private readonly leadRepository: LeadRepository;
  private readonly campaignRepository: CampaignRepository;

  constructor(leadRepository: LeadRepository, campaignRepository: CampaignRepository) {
    super();
    this.leadRepository = leadRepository;
    this.campaignRepository = campaignRepository;
  }

  /**
   * @throws {NotFoundError} Se o lead não existir.
   * @throws {ValidationError} Se `status` não for informado.
   * @throws {BusinessRuleError} Se a transição não for permitida pelo funil.
   */
  async execute({ id, status, converted_to_customer_id }: ChangeLeadStatusInput) {
    if (!status) {
      throw new ValidationError('status é obrigatório.');
    }

    const lead = await this.leadRepository.findLeadById(id);
    if (!lead) {
      throw new NotFoundError('Lead não encontrado.');
    }

    if (lead.status === status) {
      throw new ValidationError(`Lead já está com status '${status}'.`);
    }

    const allowed = VALID_TRANSITIONS[lead.status] || [];
    if (!allowed.includes(status)) {
      throw new BusinessRuleError(
        `Transição de status inválida: ${lead.status} -> ${status}. Permitidas: ${allowed.join(', ') || 'nenhuma'}`
      );
    }

    const updateData: Record<string, unknown> = { status };
    if (status === 'converted' && converted_to_customer_id) {
      updateData.converted_to_customer_id = converted_to_customer_id;
    }

    const updated = await this.leadRepository.updateLead(id, updateData);

    if (status === 'converted' && lead.campaign_id) {
      const campaign = await this.campaignRepository.findCampaignById(lead.campaign_id);
      if (campaign) {
        await this.campaignRepository.updateCampaign(campaign.id, {
          conversions: (campaign.conversions || 0) + 1,
        });
      }
    }

    return updated;
  }
}

export = ChangeLeadStatusUseCase;
