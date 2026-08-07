/**
 * `POST /api/ti/tickets/:id/reopen` — reabre `resolved`/`closed → in_progress`
 * dentro do prazo parametrizável (UC-49, RF-TI-013, E3). Self-or-module: a
 * checagem de posse é feita pelo middleware da rota, não aqui.
 *
 * @module modules/ti/application/use-cases/ticket/ReopenTicketUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import TicketRepository from '../../../domain/repositories/TicketRepository';
import TiSettingsRepository from '../../../domain/repositories/TiSettingsRepository';
import { NotFoundError, ConflictError, BusinessRuleError } from '../../../../../errors';
import { isWithinReopenWindow } from '../../../domain/services/ticketPolicyService';

class ReopenTicketUseCase extends UseCase<{ id: number }, any> {
  private readonly repository: TicketRepository;
  private readonly settingsRepository: TiSettingsRepository;

  public constructor(repository: TicketRepository, settingsRepository: TiSettingsRepository) {
    super();
    this.repository = repository;
    this.settingsRepository = settingsRepository;
  }

  /**
   * @throws {NotFoundError} Chamado não encontrado.
   * @throws {ConflictError} Chamado já está `in_progress` (idempotência negativa).
   * @throws {BusinessRuleError} Reabertura fora do prazo parametrizável (E3/RF-TI-006). HTTP 422.
   */
  public async execute({ id }: { id: number }): Promise<any> {
    const ticket = await this.repository.findById(id);
    if (!ticket) throw new NotFoundError(`Chamado ${id} não encontrado.`);

    if (ticket.status === 'in_progress') {
      throw new ConflictError('Este chamado já está em atendimento (in_progress).');
    }
    if (!['resolved', 'closed'].includes(ticket.status)) {
      throw new BusinessRuleError(`Não é possível reabrir um chamado em status "${ticket.status}".`);
    }

    if (ticket.status === 'closed') {
      const settings = await this.settingsRepository.get();
      const closedAt = ticket.closed_at ? new Date(ticket.closed_at) : null;
      if (!isWithinReopenWindow(closedAt, settings.reopen_window_days)) {
        throw new BusinessRuleError(
          `O prazo de ${settings.reopen_window_days} dias para reabertura deste chamado já expirou. Abra um novo chamado referenciando o anterior (${ticket.ticket_number}).`,
        );
      }
    }

    await this.repository.update(id, { status: 'in_progress', closed_at: null, resolved_at: null, solution: ticket.solution });
    return this.repository.findById(id);
  }
}

export = ReopenTicketUseCase;
