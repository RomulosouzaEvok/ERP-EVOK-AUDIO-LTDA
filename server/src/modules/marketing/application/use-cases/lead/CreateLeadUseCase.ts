/**
 * Caso de uso: criação de lead de marketing, cobrindo o fluxo do endpoint
 * `POST /api/marketing/leads`.
 *
 * Se `campaign_id` for informado, valida que a campanha existe e incrementa
 * `MarketingCampaign.leads_generated` na mesma operação (contador simples,
 * sem transação dedicada — mesmo padrão de contadores agregados de baixo
 * risco já usados no projeto, ex. `Sale.leads_generated`-like fields).
 *
 * @module modules/marketing/application/use-cases/lead/CreateLeadUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../../errors';
import LeadRepository from '../../../domain/repositories/LeadRepository';
import CampaignRepository from '../../../domain/repositories/CampaignRepository';

type CreateLeadInput = Record<string, any>;

class CreateLeadUseCase extends UseCase<CreateLeadInput, any> {
  private readonly leadRepository: LeadRepository;
  private readonly campaignRepository: CampaignRepository;

  constructor(leadRepository: LeadRepository, campaignRepository: CampaignRepository) {
    super();
    this.leadRepository = leadRepository;
    this.campaignRepository = campaignRepository;
  }

  /**
   * @throws {NotFoundError} Se `campaign_id` não corresponder a uma campanha existente.
   */
  async execute(input: CreateLeadInput) {
    if (input.campaign_id) {
      const campaign = await this.campaignRepository.findCampaignById(input.campaign_id);
      if (!campaign) {
        throw new NotFoundError('Campanha não encontrada.');
      }

      const lead = await this.leadRepository.createLead(input);
      await this.campaignRepository.updateCampaign(campaign.id, {
        leads_generated: (campaign.leads_generated || 0) + 1,
      });
      return lead;
    }

    return this.leadRepository.createLead(input);
  }
}

export = CreateLeadUseCase;
