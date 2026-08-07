/**
 * `POST /api/ti/tickets/:id/resume` — `waiting → in_progress`, retoma o
 * cronômetro de resolução, acumulando `waiting_minutes` (UC-49, RF-TI-009).
 *
 * @module modules/ti/application/use-cases/ticket/ResumeTicketUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import TicketRepository from '../../../domain/repositories/TicketRepository';
import { NotFoundError, ValidationError } from '../../../../../errors';

class ResumeTicketUseCase extends UseCase<{ id: number }, any> {
  private readonly repository: TicketRepository;

  public constructor(repository: TicketRepository) {
    super();
    this.repository = repository;
  }

  /**
   * @throws {NotFoundError} Chamado não encontrado.
   * @throws {ValidationError} Chamado não está `waiting`.
   */
  public async execute({ id }: { id: number }): Promise<any> {
    const ticket = await this.repository.findById(id);
    if (!ticket) throw new NotFoundError(`Chamado ${id} não encontrado.`);
    if (ticket.status !== 'waiting') {
      throw new ValidationError('Só é possível retomar um chamado "waiting".');
    }

    const waitingSince = ticket.updatedAt ? new Date(ticket.updatedAt) : new Date();
    const elapsedMinutes = Math.max(0, Math.round((Date.now() - waitingSince.getTime()) / 60000));

    await this.repository.update(id, {
      status: 'in_progress',
      waiting_minutes: (ticket.waiting_minutes ?? 0) + elapsedMinutes,
    });
    return this.repository.findById(id);
  }
}

export = ResumeTicketUseCase;
