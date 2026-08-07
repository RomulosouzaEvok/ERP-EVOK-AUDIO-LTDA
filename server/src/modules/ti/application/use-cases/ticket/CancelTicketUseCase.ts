/**
 * `POST /api/ti/tickets/:id/cancel` — `open → canceled` (UC-49, RF-TI-016).
 *
 * @module modules/ti/application/use-cases/ticket/CancelTicketUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import TicketRepository from '../../../domain/repositories/TicketRepository';
import { NotFoundError, ValidationError } from '../../../../../errors';

class CancelTicketUseCase extends UseCase<{ id: number }, any> {
  private readonly repository: TicketRepository;

  public constructor(repository: TicketRepository) {
    super();
    this.repository = repository;
  }

  /**
   * @throws {NotFoundError} Chamado não encontrado.
   * @throws {ValidationError} Chamado não está `open`.
   */
  public async execute({ id }: { id: number }): Promise<any> {
    const ticket = await this.repository.findById(id);
    if (!ticket) throw new NotFoundError(`Chamado ${id} não encontrado.`);
    if (ticket.status !== 'open') {
      throw new ValidationError('Só é possível cancelar um chamado ainda "open" (sem atendimento iniciado).');
    }

    await this.repository.update(id, { status: 'canceled' });
    return this.repository.findById(id);
  }
}

export = CancelTicketUseCase;
