/**
 * Caso de uso: listagem paginada de campanhas de marketing, cobrindo o
 * fluxo do endpoint `GET /api/marketing/campaigns`.
 *
 * @module modules/marketing/application/use-cases/campaign/ListCampaignsUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import CampaignRepository from '../../../domain/repositories/CampaignRepository';

type ListCampaignsInput = {
  status?: string;
  campaign_type?: string;
  page?: number;
  limit?: number;
  offset?: number;
};

class ListCampaignsUseCase extends UseCase<ListCampaignsInput, any> {
  private readonly campaignRepository: CampaignRepository;

  constructor(campaignRepository: CampaignRepository) {
    super();
    this.campaignRepository = campaignRepository;
  }

  async execute({ status, campaign_type, page = 1, limit = 20, offset = 0 }: ListCampaignsInput = {}) {
    const { rows, count } = await this.campaignRepository.listCampaigns({ status, campaign_type }, { limit, offset });
    return { rows, count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

export = ListCampaignsUseCase;
