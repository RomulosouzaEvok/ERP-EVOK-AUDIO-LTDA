/**
 * `GET /api/ti/tickets/mine` — lista os próprios chamados, sempre
 * auto-filtrado por `req.user.id` (UC-49, RF-TI-015). Não usa
 * `authorizeSelfOrModule` — sem alternativa de módulo, o filtro é sempre
 * pelo próprio usuário.
 *
 * @module modules/ti/application/use-cases/ticket/ListMyTicketsUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import TicketRepository from '../../../domain/repositories/TicketRepository';
import { toTicketSummaryDTO } from '../../../infrastructure/mappers/TicketMapper';

interface Input {
  requesterId: number;
  status?: string;
  page: number;
  limit: number;
}

class ListMyTicketsUseCase extends UseCase<Input, any> {
  private readonly repository: TicketRepository;

  public constructor(repository: TicketRepository) {
    super();
    this.repository = repository;
  }

  public async execute({ requesterId, status, page, limit }: Input): Promise<{ rows: unknown[]; total: number; page: number; limit: number; totalPages: number }> {
    const offset = (page - 1) * limit;
    const { count, rows } = await this.repository.findAndCount({ requester_id: requesterId, status }, { limit, offset });
    return { rows: rows.map(toTicketSummaryDTO), total: count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

export = ListMyTicketsUseCase;
