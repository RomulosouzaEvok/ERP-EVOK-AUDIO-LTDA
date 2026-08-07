/**
 * `GET /api/ti/ticket-categories/active` — versão enxuta e
 * público-autenticada, usada para popular o seletor de categoria na
 * abertura de chamado por qualquer usuário (RF-TI-001/BR-TI-001).
 *
 * @module modules/ti/application/use-cases/ticket/ListActiveTicketCategoriesUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import TicketRepository from '../../../domain/repositories/TicketRepository';

class ListActiveTicketCategoriesUseCase extends UseCase<void, any[]> {
  private readonly repository: TicketRepository;

  public constructor(repository: TicketRepository) {
    super();
    this.repository = repository;
  }

  public async execute(): Promise<any[]> {
    const categories = await this.repository.listActiveCategories();
    return categories.map((c: any) => ({ id: c.id, name: c.name, default_priority: c.default_priority }));
  }
}

export = ListActiveTicketCategoriesUseCase;
