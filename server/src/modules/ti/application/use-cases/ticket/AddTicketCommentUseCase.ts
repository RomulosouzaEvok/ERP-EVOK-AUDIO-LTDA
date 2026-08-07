/**
 * `POST /api/ti/tickets/:id/comments` — adiciona comentário/nota interna
 * (UC-49, RF-TI-014). Self-or-module: a posse (dono do chamado) é checada
 * pelo middleware da rota; este use case só valida a permissão adicional
 * de `is_internal`.
 *
 * @module modules/ti/application/use-cases/ticket/AddTicketCommentUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import TicketRepository from '../../../domain/repositories/TicketRepository';
import { NotFoundError, ValidationError, ForbiddenError } from '../../../../../errors';
import type { AddTicketCommentInput } from '../../../domain/entities/TicketTypes';
import { toCommentDTO } from '../../../infrastructure/mappers/TicketMapper';

class AddTicketCommentUseCase extends UseCase<AddTicketCommentInput, any> {
  private readonly repository: TicketRepository;

  public constructor(repository: TicketRepository) {
    super();
    this.repository = repository;
  }

  /**
   * @throws {NotFoundError} Chamado não encontrado.
   * @throws {ValidationError} `body` ausente.
   * @throws {ForbiddenError} `is_internal: true` solicitado por quem não tem módulo `ti` (RF-TI-014). HTTP 403.
   */
  public async execute({ ticketId, authorId, body, isInternal, authorHasTiModule }: AddTicketCommentInput): Promise<any> {
    if (!body || !body.trim()) throw new ValidationError('O comentário (body) não pode ser vazio.');
    if (isInternal && !authorHasTiModule) {
      throw new ForbiddenError('Apenas usuários com o módulo TI podem registrar notas internas (is_internal=true).');
    }

    const ticket = await this.repository.findById(ticketId);
    if (!ticket) throw new NotFoundError(`Chamado ${ticketId} não encontrado.`);

    const comment = await this.repository.createComment({
      ticket_id: ticketId,
      author_id: authorId,
      body,
      is_internal: isInternal,
    });

    return toCommentDTO(comment, true);
  }
}

export = AddTicketCommentUseCase;
