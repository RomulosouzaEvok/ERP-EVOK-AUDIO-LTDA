/**
 * Caso de uso: atualização de campanha de marketing, cobrindo o fluxo do
 * endpoint `PUT /api/marketing/campaigns/:id`.
 *
 * @module modules/marketing/application/use-cases/campaign/UpdateCampaignUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError, ValidationError } from '../../../../../errors';
import CampaignRepository from '../../../domain/repositories/CampaignRepository';

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
   */
  async execute({ id, ...rest }: UpdateCampaignInput) {
    const current = await this.campaignRepository.findCampaignById(id);
    if (!current) {
      throw new NotFoundError('Campanha não encontrada.');
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
