/**
 * `POST /api/ti/tickets/:id/confirm` — solicitante confirma resolução
 * (+ satisfação opcional) → `closed` (UC-49, RF-TI-012). Self-or-module: a
 * checagem de posse (`ticket.requester_id === req.user.id`) é feita pelo
 * middleware `authorizeSelfOrModule` na rota, não aqui.
 *
 * @module modules/ti/application/use-cases/ticket/ConfirmTicketUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import TicketRepository from '../../../domain/repositories/TicketRepository';
import { NotFoundError, ValidationError } from '../../../../../errors';
import type { ConfirmTicketInput } from '../../../domain/entities/TicketTypes';

class ConfirmTicketUseCase extends UseCase<ConfirmTicketInput, any> {
  private readonly repository: TicketRepository;

  public constructor(repository: TicketRepository) {
    super();
    this.repository = repository;
  }

  /**
   * @throws {NotFoundError} Chamado não encontrado.
   * @throws {ValidationError} Chamado não está `resolved` (E1/UC-49).
   */
  public async execute({ id, satisfaction_rating, satisfaction_comment }: ConfirmTicketInput): Promise<any> {
    const ticket = await this.repository.findById(id);
    if (!ticket) throw new NotFoundError(`Chamado ${id} não encontrado.`);
    if (ticket.status !== 'resolved') {
      throw new ValidationError('Só é possível confirmar/fechar um chamado que já esteja "resolved" — registre a solução primeiro.');
    }

    await this.repository.update(id, {
      status: 'closed',
      closed_at: new Date(),
      satisfaction_rating: satisfaction_rating ?? null,
      satisfaction_comment: satisfaction_comment ?? null,
    });
    return this.repository.findById(id);
  }
}

export = ConfirmTicketUseCase;
