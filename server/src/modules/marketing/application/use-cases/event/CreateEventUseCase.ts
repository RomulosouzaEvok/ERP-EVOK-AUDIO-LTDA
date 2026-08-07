/**
 * Caso de uso: criação de evento/feira de marketing, cobrindo o fluxo do
 * endpoint `POST /api/marketing/events` (RF-MKT-020, UC-65).
 *
 * @module modules/marketing/application/use-cases/event/CreateEventUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError, ValidationError } from '../../../../../errors';
import EventRepository from '../../../domain/repositories/EventRepository';
import CampaignRepository from '../../../domain/repositories/CampaignRepository';

type CreateEventInput = Record<string, any>;

class CreateEventUseCase extends UseCase<CreateEventInput, any> {
  private readonly eventRepository: EventRepository;
  private readonly campaignRepository: CampaignRepository;

  constructor(eventRepository: EventRepository, campaignRepository: CampaignRepository) {
    super();
    this.eventRepository = eventRepository;
    this.campaignRepository = campaignRepository;
  }

  /**
   * @throws {ValidationError} Se `end_date` vier antes de `start_date`.
   * @throws {NotFoundError} Se `campaign_id` informado não existir.
   */
  async execute(input: CreateEventInput) {
    if (input.end_date && new Date(input.end_date) < new Date(input.start_date)) {
      throw new ValidationError('end_date não pode ser anterior a start_date.');
    }

    if (input.campaign_id) {
      const campaign = await this.campaignRepository.findCampaignById(input.campaign_id);
      if (!campaign) {
        throw new NotFoundError('Campanha não encontrada.');
      }
    }

    return this.eventRepository.createEvent(input);
  }
}

export = CreateEventUseCase;
