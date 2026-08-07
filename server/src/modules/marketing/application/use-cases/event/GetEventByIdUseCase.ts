/**
 * Caso de uso: busca de um evento/feira de marketing por id, cobrindo o
 * fluxo do endpoint `GET /api/marketing/events/:id`. Inclui `leads_count`
 * (RF-MKT-023) e `cost_per_lead` (RF-MKT-024), sempre calculados em tempo
 * de leitura — nunca colunas persistidas.
 *
 * @module modules/marketing/application/use-cases/event/GetEventByIdUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../../errors';
import EventRepository from '../../../domain/repositories/EventRepository';
import LeadRepository from '../../../domain/repositories/LeadRepository';

type GetEventByIdInput = { id: number };

class GetEventByIdUseCase extends UseCase<GetEventByIdInput, any> {
  private readonly eventRepository: EventRepository;
  private readonly leadRepository: LeadRepository;

  constructor(eventRepository: EventRepository, leadRepository: LeadRepository) {
    super();
    this.eventRepository = eventRepository;
    this.leadRepository = leadRepository;
  }

  /** @throws {NotFoundError} Se o evento não existir. */
  async execute({ id }: GetEventByIdInput) {
    const event = await this.eventRepository.findEventById(id);
    if (!event) {
      throw new NotFoundError('Evento não encontrado.');
    }

    const leads = await this.leadRepository.findByEventId(id);
    const leadsCount = leads.length;
    const actualCost = event.actual_cost !== null && event.actual_cost !== undefined ? Number(event.actual_cost) : null;
    const costPerLead = actualCost !== null && leadsCount > 0 ? (actualCost / leadsCount).toFixed(2) : null;

    const plain = typeof event.toJSON === 'function' ? event.toJSON() : event;
    return { ...plain, leads_count: leadsCount, cost_per_lead: costPerLead };
  }
}

export = GetEventByIdUseCase;
