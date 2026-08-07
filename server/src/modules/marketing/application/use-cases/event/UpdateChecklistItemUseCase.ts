/**
 * Caso de uso: atualização de item de checklist de evento/feira, cobrindo
 * o fluxo do endpoint `PUT /api/marketing/events/:id/checklist/:itemId`.
 *
 * @module modules/marketing/application/use-cases/event/UpdateChecklistItemUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../../errors';
import EventRepository from '../../../domain/repositories/EventRepository';

type UpdateChecklistItemInput = { eventId: number; itemId: number } & Record<string, any>;

class UpdateChecklistItemUseCase extends UseCase<UpdateChecklistItemInput, any> {
  private readonly eventRepository: EventRepository;

  constructor(eventRepository: EventRepository) {
    super();
    this.eventRepository = eventRepository;
  }

  /** @throws {NotFoundError} Se o evento ou o item de checklist não existirem. */
  async execute({ eventId, itemId, ...rest }: UpdateChecklistItemInput) {
    const current = await this.eventRepository.findChecklistItemById(eventId, itemId);
    if (!current) {
      throw new NotFoundError('Item de checklist não encontrado.');
    }

    return this.eventRepository.updateChecklistItem(eventId, itemId, rest);
  }
}

export = UpdateChecklistItemUseCase;
