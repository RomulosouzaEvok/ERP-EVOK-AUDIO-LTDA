/**
 * `GET /api/ti/ticket-categories` — lista categorias (ti:operate), com
 * filtro `active` (RF-TI-001).
 *
 * @module modules/ti/application/use-cases/ticket/ListTicketCategoriesUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import TicketRepository from '../../../domain/repositories/TicketRepository';
import { toCategoryDTO } from '../../../infrastructure/mappers/TicketMapper';

interface Input {
  active?: string;
  page: number;
  limit: number;
}

class ListTicketCategoriesUseCase extends UseCase<Input, any> {
  private readonly repository: TicketRepository;

  public constructor(repository: TicketRepository) {
    super();
    this.repository = repository;
  }

  public async execute({ active, page, limit }: Input): Promise<{ rows: unknown[]; total: number; page: number; limit: number; totalPages: number }> {
    const offset = (page - 1) * limit;
    const { count, rows } = await this.repository.findAndCountCategories({ active }, { limit, offset });
    return { rows: rows.map(toCategoryDTO), total: count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

export = ListTicketCategoriesUseCase;
