/**
 * `GET /api/ti/tickets/:id/comments` — lista comentários, filtrando notas
 * `is_internal` para quem não tem módulo `ti` (UC-49, RF-TI-014).
 *
 * @module modules/ti/application/use-cases/ticket/ListTicketCommentsUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import TicketRepository from '../../../domain/repositories/TicketRepository';
import { NotFoundError } from '../../../../../errors';
import { toCommentDTO } from '../../../infrastructure/mappers/TicketMapper';

interface Input {
  ticketId: number;
  viewerHasTiModule: boolean;
}

class ListTicketCommentsUseCase extends UseCase<Input, any[]> {
  private readonly repository: TicketRepository;

  public constructor(repository: TicketRepository) {
    super();
    this.repository = repository;
  }

  /** @throws {NotFoundError} Chamado não encontrado. */
  public async execute({ ticketId, viewerHasTiModule }: Input): Promise<any[]> {
    const ticket = await this.repository.findById(ticketId);
    if (!ticket) throw new NotFoundError(`Chamado ${ticketId} não encontrado.`);

    const comments = await this.repository.listComments(ticketId);
    return comments.map((c) => toCommentDTO(c, viewerHasTiModule)).filter((c) => c !== null);
  }
}

export = ListTicketCommentsUseCase;
