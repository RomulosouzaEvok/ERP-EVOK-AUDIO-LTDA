/**
 * Caso de uso: listagem paginada de eventos/feiras de marketing, cobrindo
 * o fluxo do endpoint `GET /api/marketing/events`.
 *
 * @module modules/marketing/application/use-cases/event/ListEventsUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import EventRepository from '../../../domain/repositories/EventRepository';

type ListEventsInput = {
  status?: string;
  event_type?: string;
  campaign_id?: number;
  page?: number;
  limit?: number;
  offset?: number;
};

class ListEventsUseCase extends UseCase<ListEventsInput, any> {
  private readonly eventRepository: EventRepository;

  constructor(eventRepository: EventRepository) {
    super();
    this.eventRepository = eventRepository;
  }

  async execute({ status, event_type, campaign_id, page = 1, limit = 20, offset = 0 }: ListEventsInput = {}) {
    const { rows, count } = await this.eventRepository.listEvents({ status, event_type, campaign_id }, { limit, offset });
    return { rows, count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

export = ListEventsUseCase;
