/**
 * Use case: listar Ações Corretivas (recurso polimórfico multi-origem).
 *
 * @module modules/sst/application/use-cases/correctiveAction/ListCorrectiveActionsUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import CorrectiveActionRepository from '../../../domain/repositories/CorrectiveActionRepository';
import { toCorrectiveActionDTO } from '../../../infrastructure/mappers/CorrectiveActionMapper';

class ListCorrectiveActionsUseCase extends UseCase<Record<string, any>, any> {
  private readonly repository: CorrectiveActionRepository;

  public constructor(repository: CorrectiveActionRepository) {
    super();
    this.repository = repository;
  }

  /** @param input - Filtros (`origem`, `status`, `responsavel_id`, `atrasada`) e paginação. */
  public async execute(input: Record<string, any>) {
    const { page = '1', limit = '20', ...filters } = input;
    const p = parseInt(String(page), 10);
    const l = parseInt(String(limit), 10);
    const { count, rows } = await this.repository.findAndCount(filters, { limit: l, offset: (p - 1) * l });
    return { rows: rows.map(toCorrectiveActionDTO), total: count, page: p, limit: l, totalPages: Math.ceil(count / l) };
  }
}

export = ListCorrectiveActionsUseCase;
