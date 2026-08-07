/**
 * Caso de uso: criação de campanha de marketing, cobrindo o fluxo do
 * endpoint `POST /api/marketing/campaigns`.
 *
 * @module modules/marketing/application/use-cases/campaign/CreateCampaignUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { ValidationError } from '../../../../../errors';
import CampaignRepository from '../../../domain/repositories/CampaignRepository';

type CreateCampaignInput = Record<string, any>;

class CreateCampaignUseCase extends UseCase<CreateCampaignInput, any> {
  private readonly campaignRepository: CampaignRepository;

  constructor(campaignRepository: CampaignRepository) {
    super();
    this.campaignRepository = campaignRepository;
  }

  /**
   * @throws {ValidationError} Se `end_date` vier antes de `start_date`.
   */
  async execute(input: CreateCampaignInput) {
    if (input.end_date && new Date(input.end_date) < new Date(input.start_date)) {
      throw new ValidationError('end_date não pode ser anterior a start_date.');
    }

    return this.campaignRepository.createCampaign(input);
  }
}

export = CreateCampaignUseCase;
