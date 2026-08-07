/**
 * Caso de uso: busca de uma campanha de marketing por id, cobrindo o fluxo
 * do endpoint `GET /api/marketing/campaigns/:id`.
 *
 * @module modules/marketing/application/use-cases/campaign/GetCampaignByIdUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../../errors';
import CampaignRepository from '../../../domain/repositories/CampaignRepository';

type GetCampaignByIdInput = { id: number };

class GetCampaignByIdUseCase extends UseCase<GetCampaignByIdInput, any> {
  private readonly campaignRepository: CampaignRepository;

  constructor(campaignRepository: CampaignRepository) {
    super();
    this.campaignRepository = campaignRepository;
  }

  async execute({ id }: GetCampaignByIdInput) {
    const campaign = await this.campaignRepository.findCampaignById(id);
    if (!campaign) {
      throw new NotFoundError('Campanha não encontrada.');
    }
    return campaign;
  }
}

export = GetCampaignByIdUseCase;
