/**
 * `POST /api/ti/tickets/:id/wait` — `in_progress → waiting`, pausa o
 * cronômetro de resolução (UC-49, RF-TI-009).
 *
 * @module modules/ti/application/use-cases/ticket/WaitTicketUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import TicketRepository from '../../../domain/repositories/TicketRepository';
import { NotFoundError, ValidationError } from '../../../../../errors';

class WaitTicketUseCase extends UseCase<{ id: number }, any> {
  private readonly repository: TicketRepository;

  public constructor(repository: TicketRepository) {
    super();
    this.repository = repository;
  }

  /**
   * @throws {NotFoundError} Chamado não encontrado.
   * @throws {ValidationError} Chamado não está `in_progress`.
   */
  public async execute({ id }: { id: number }): Promise<any> {
    const ticket = await this.repository.findById(id);
    if (!ticket) throw new NotFoundError(`Chamado ${id} não encontrado.`);
    if (ticket.status !== 'in_progress') {
      throw new ValidationError('Só é possível colocar em espera um chamado "in_progress".');
    }

    // A marcação exata do início da espera usa o próprio `updatedAt` desta
    // transição (aproximação aceitável, documentada): `ResumeTicketUseCase`
    // calcula `waiting_minutes` a partir da diferença entre `updatedAt`
    // (momento deste `wait`) e o instante da retomada — não há coluna
    // dedicada `waiting_started_at` neste schema (RF-TI-009, escopo P1).
    await this.repository.update(id, { status: 'waiting' });
    return this.repository.findById(id);
  }
}

export = WaitTicketUseCase;
