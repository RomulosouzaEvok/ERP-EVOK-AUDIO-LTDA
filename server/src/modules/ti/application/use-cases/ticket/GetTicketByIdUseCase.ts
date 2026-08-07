/**
 * `GET /api/ti/tickets/:id` — detalhe do chamado (UC-49, self-or-module).
 * Notas internas (`is_internal`) são omitidas dos comentários para quem
 * não tem módulo `ti` (filtro aplicado aqui, não no controller).
 *
 * @module modules/ti/application/use-cases/ticket/GetTicketByIdUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import TicketRepository from '../../../domain/repositories/TicketRepository';
import { NotFoundError } from '../../../../../errors';
import { toTicketDetailDTO, toCommentDTO } from '../../../infrastructure/mappers/TicketMapper';

interface Input {
  id: number;
  viewerHasTiModule: boolean;
}

class GetTicketByIdUseCase extends UseCase<Input, any> {
  private readonly repository: TicketRepository;

  public constructor(repository: TicketRepository) {
    super();
    this.repository = repository;
  }

  /** @throws {NotFoundError} Chamado não encontrado. */
  public async execute({ id, viewerHasTiModule }: Input): Promise<any> {
    const ticket = await this.repository.findById(id);
    if (!ticket) throw new NotFoundError(`Chamado ${id} não encontrado.`);

    const rawComments = await this.repository.listComments(id);
    const comments = rawComments.map((c) => toCommentDTO(c, viewerHasTiModule)).filter((c) => c !== null);

    return toTicketDetailDTO(ticket, comments as Record<string, unknown>[]);
  }
}

export = GetTicketByIdUseCase;
