/**
 * `PUT /api/ti/tickets/:id/priority` — reclassifica prioridade, gravando
 * histórico de/para (UC-49, RF-TI-005/BR-TI-007).
 *
 * @module modules/ti/application/use-cases/ticket/ChangeTicketPriorityUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import TicketRepository from '../../../domain/repositories/TicketRepository';
import { NotFoundError, ValidationError } from '../../../../../errors';
import type { ChangeTicketPriorityInput } from '../../../domain/entities/TicketTypes';

class ChangeTicketPriorityUseCase extends UseCase<ChangeTicketPriorityInput, any> {
  private readonly repository: TicketRepository;

  public constructor(repository: TicketRepository) {
    super();
    this.repository = repository;
  }

  /**
   * @throws {NotFoundError} Chamado não encontrado.
   * @throws {ValidationError} `priority` ausente/inválida.
   */
  public async execute({ id, priority, impact, urgency, reason, changedBy }: ChangeTicketPriorityInput): Promise<any> {
    if (!priority) throw new ValidationError('priority é obrigatória.');

    const ticket = await this.repository.findById(id);
    if (!ticket) throw new NotFoundError(`Chamado ${id} não encontrado.`);

    const previousPriority = ticket.priority;
    if (previousPriority !== priority) {
      await this.repository.createPriorityHistory({
        ticket_id: id,
        changed_by: changedBy,
        previous_priority: previousPriority,
        new_priority: priority,
        reason: reason ?? null,
      });
    }

    const updateData: Record<string, unknown> = { priority };
    if (impact !== undefined) updateData.impact = impact;
    if (urgency !== undefined) updateData.urgency = urgency;
    await this.repository.update(id, updateData);

    return this.repository.findById(id);
  }
}

export = ChangeTicketPriorityUseCase;
