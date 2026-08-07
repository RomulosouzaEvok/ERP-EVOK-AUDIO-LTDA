/**
 * `POST /api/ti/tickets/:id/resolve` — registra `solution` (obrigatória) →
 * `resolved` (UC-49, RF-TI-008/BR-TI-004).
 *
 * @module modules/ti/application/use-cases/ticket/ResolveTicketUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import TicketRepository from '../../../domain/repositories/TicketRepository';
import { NotFoundError, ValidationError, BusinessRuleError } from '../../../../../errors';
import type { ResolveTicketInput } from '../../../domain/entities/TicketTypes';

class ResolveTicketUseCase extends UseCase<ResolveTicketInput, any> {
  private readonly repository: TicketRepository;

  public constructor(repository: TicketRepository) {
    super();
    this.repository = repository;
  }

  /**
   * @throws {NotFoundError} Chamado não encontrado.
   * @throws {ValidationError} Chamado em status que não pode ir a `resolved` diretamente.
   * @throws {BusinessRuleError} `solution` vazia (BR-TI-004). HTTP 422.
   */
  public async execute({ id, solution }: ResolveTicketInput): Promise<any> {
    if (!solution || !solution.trim()) {
      throw new BusinessRuleError('O campo "solution" é obrigatório para resolver um chamado.');
    }

    const ticket = await this.repository.findById(id);
    if (!ticket) throw new NotFoundError(`Chamado ${id} não encontrado.`);
    if (!['in_progress', 'waiting'].includes(ticket.status)) {
      throw new ValidationError(`Não é possível resolver um chamado em status "${ticket.status}" — ele precisa estar em atendimento.`);
    }

    await this.repository.update(id, { status: 'resolved', solution, resolved_at: new Date() });
    return this.repository.findById(id);
  }
}

export = ResolveTicketUseCase;
