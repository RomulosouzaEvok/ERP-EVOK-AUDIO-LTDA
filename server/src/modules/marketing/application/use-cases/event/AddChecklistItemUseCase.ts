/**
 * Caso de uso: adição de item de checklist a um evento/feira, cobrindo o
 * fluxo do endpoint `POST /api/marketing/events/:id/checklist`
 * (RF-MKT-021).
 *
 * @module modules/marketing/application/use-cases/event/AddChecklistItemUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../../errors';
import EventRepository from '../../../domain/repositories/EventRepository';

type AddChecklistItemInput = {
  eventId: number;
  description: string;
  responsible_user_id?: number;
};

class AddChecklistItemUseCase extends UseCase<AddChecklistItemInput, any> {
  private readonly eventRepository: EventRepository;

  constructor(eventRepository: EventRepository) {
    super();
    this.eventRepository = eventRepository;
  }

  /** @throws {NotFoundError} Se o evento não existir. */
  async execute({ eventId, description, responsible_user_id }: AddChecklistItemInput) {
    const event = await this.eventRepository.findEventById(eventId);
    if (!event) {
      throw new NotFoundError('Evento não encontrado.');
    }

    return this.eventRepository.addChecklistItem(eventId, {
      description,
      responsible_user_id: responsible_user_id ?? null,
      status: 'pending',
    });
  }
}

export = AddChecklistItemUseCase;
