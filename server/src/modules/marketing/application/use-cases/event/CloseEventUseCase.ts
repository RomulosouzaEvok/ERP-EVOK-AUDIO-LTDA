/**
 * Caso de uso: encerramento de evento/feira, cobrindo o fluxo do endpoint
 * `POST /api/marketing/events/:id/close` (RF-MKT-025, UC-65 fluxo de
 * exceção E1).
 *
 * @module modules/marketing/application/use-cases/event/CloseEventUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError, ValidationError, BusinessRuleError } from '../../../../../errors';
import EventRepository from '../../../domain/repositories/EventRepository';

type CloseEventInput = { id: number; actual_cost?: number };

class CloseEventUseCase extends UseCase<CloseEventInput, any> {
  private readonly eventRepository: EventRepository;

  constructor(eventRepository: EventRepository) {
    super();
    this.eventRepository = eventRepository;
  }

  /**
   * @throws {NotFoundError} Se o evento não existir.
   * @throws {ValidationError} Se `actual_cost` não vier no payload nem já estiver gravado.
   * @throws {BusinessRuleError} Se o evento já estiver `completed`/`canceled`.
   */
  async execute({ id, actual_cost }: CloseEventInput) {
    const event = await this.eventRepository.findEventById(id);
    if (!event) {
      throw new NotFoundError('Evento não encontrado.');
    }

    if (['completed', 'canceled'].includes(event.status)) {
      throw new BusinessRuleError(`Evento já está '${event.status}'.`);
    }

    const finalActualCost = actual_cost ?? event.actual_cost;
    if (finalActualCost === undefined || finalActualCost === null) {
      throw new ValidationError('actual_cost é obrigatório para encerrar o evento (nem informado nem já gravado).');
    }

    return this.eventRepository.updateEvent(id, {
      actual_cost: finalActualCost,
      status: 'completed',
    });
  }
}

export = CloseEventUseCase;
