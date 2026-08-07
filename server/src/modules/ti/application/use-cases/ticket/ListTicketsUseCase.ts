/**
 * `GET /api/ti/tickets` — fila completa do helpdesk (UC-49, atrás de
 * `authorizeModule('ti','operate')`, sem filtro de dono).
 *
 * @module modules/ti/application/use-cases/ticket/ListTicketsUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import TicketRepository from '../../../domain/repositories/TicketRepository';
import { toTicketSummaryDTO } from '../../../infrastructure/mappers/TicketMapper';

interface Input {
  filters: Record<string, unknown>;
  page: number;
  limit: number;
}

class ListTicketsUseCase extends UseCase<Input, any> {
  private readonly repository: TicketRepository;

  public constructor(repository: TicketRepository) {
    super();
    this.repository = repository;
  }

  public async execute({ filters, page, limit }: Input): Promise<{ rows: unknown[]; total: number; page: number; limit: number; totalPages: number }> {
    const offset = (page - 1) * limit;
    const { count, rows } = await this.repository.findAndCount(filters, { limit, offset });
    return { rows: rows.map(toTicketSummaryDTO), total: count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

export = ListTicketsUseCase;
