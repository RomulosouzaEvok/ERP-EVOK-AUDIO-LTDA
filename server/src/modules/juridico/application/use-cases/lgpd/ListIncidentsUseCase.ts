/**
 * `GET /api/jur/lgpd/incidents` — lista, shape resumido (sem
 * `description`/`plano_acao`, §0.4 da API).
 *
 * @module modules/juridico/application/use-cases/lgpd/ListIncidentsUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import LgpdIncidentRepository from '../../../domain/repositories/LgpdIncidentRepository';

interface ListInput {
  filters: Record<string, unknown>;
  page: number;
  limit: number;
}

class ListIncidentsUseCase extends UseCase<ListInput, any> {
  private readonly repository: LgpdIncidentRepository;

  public constructor(repository: LgpdIncidentRepository) {
    super();
    this.repository = repository;
  }

  public async execute({ filters, page, limit }: ListInput): Promise<any> {
    const offset = (page - 1) * limit;
    const { count, rows } = await this.repository.findAndCount(filters, { limit, offset });
    return { rows, total: count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

export = ListIncidentsUseCase;
