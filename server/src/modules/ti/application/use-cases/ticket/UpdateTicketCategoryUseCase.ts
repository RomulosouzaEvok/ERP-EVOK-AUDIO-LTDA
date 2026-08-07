/**
 * `PUT /api/ti/ticket-categories/:id` — atualiza categoria, inclusive
 * `active:false` (sem DELETE — catálogo referenciado por `ItTicket`,
 * RF-TI-001).
 *
 * @module modules/ti/application/use-cases/ticket/UpdateTicketCategoryUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import TicketRepository from '../../../domain/repositories/TicketRepository';
import { NotFoundError } from '../../../../../errors';
import { toCategoryDTO } from '../../../infrastructure/mappers/TicketMapper';

interface Input {
  id: number;
  name?: string;
  description?: string;
  default_priority?: string;
  active?: boolean;
}

class UpdateTicketCategoryUseCase extends UseCase<Input, any> {
  private readonly repository: TicketRepository;

  public constructor(repository: TicketRepository) {
    super();
    this.repository = repository;
  }

  /** @throws {NotFoundError} Categoria não encontrada. */
  public async execute({ id, ...data }: Input): Promise<any> {
    const updated = await this.repository.updateCategory(id, data);
    if (!updated) throw new NotFoundError(`Categoria de chamado ${id} não encontrada.`);
    return toCategoryDTO(updated);
  }
}

export = UpdateTicketCategoryUseCase;
