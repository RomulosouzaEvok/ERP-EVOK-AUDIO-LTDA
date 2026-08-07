/**
 * `POST /api/ti/tickets/:id/assign` — analista assume o chamado, triagem
 * implícita (UC-49, RF-TI-004).
 *
 * @module modules/ti/application/use-cases/ticket/AssignTicketUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import TicketRepository from '../../../domain/repositories/TicketRepository';
import { NotFoundError, ValidationError } from '../../../../../errors';
import type { AssignTicketInput } from '../../../domain/entities/TicketTypes';

class AssignTicketUseCase extends UseCase<AssignTicketInput, any> {
  private readonly repository: TicketRepository;

  public constructor(repository: TicketRepository) {
    super();
    this.repository = repository;
  }

  /**
   * @throws {NotFoundError} Chamado não encontrado.
   * @throws {ValidationError} Chamado já `resolved`/`closed`/`canceled` (não pode ser atribuído novamente).
   */
  public async execute({ id, assignedTo, category_id, impact, urgency }: AssignTicketInput): Promise<any> {
    const ticket = await this.repository.findById(id);
    if (!ticket) throw new NotFoundError(`Chamado ${id} não encontrado.`);
    if (['resolved', 'closed', 'canceled'].includes(ticket.status)) {
      throw new ValidationError(`Chamado ${ticket.ticket_number} já está em status "${ticket.status}" e não pode ser atribuído.`);
    }

    const updateData: Record<string, unknown> = {
      assigned_to: assignedTo,
      status: 'in_progress',
    };
    if (!ticket.first_response_at) updateData.first_response_at = new Date();
    if (category_id) updateData.category_id = category_id;
    if (impact !== undefined) updateData.impact = impact;
    if (urgency !== undefined) updateData.urgency = urgency;

    await this.repository.update(id, updateData);
    return this.repository.findById(id);
  }
}

export = AssignTicketUseCase;
