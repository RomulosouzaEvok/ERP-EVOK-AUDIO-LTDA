/**
 * `GET /api/jur/legal-case-deadlines` — lista/fila, shape resumido (sem
 * `evidence_file_path`, §0.4 da API).
 *
 * @module modules/juridico/application/use-cases/deadline/ListDeadlinesUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import DeadlineRepository from '../../../domain/repositories/DeadlineRepository';

interface ListDeadlinesInput {
  filters: Record<string, unknown>;
  page: number;
  limit: number;
}

class ListDeadlinesUseCase extends UseCase<ListDeadlinesInput, any> {
  private readonly repository: DeadlineRepository;

  public constructor(repository: DeadlineRepository) {
    super();
    this.repository = repository;
  }

  public async execute({ filters, page, limit }: ListDeadlinesInput): Promise<any> {
    const offset = (page - 1) * limit;
    const { count, rows } = await this.repository.findAndCount(filters, { limit, offset });
    return { rows, total: count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

export = ListDeadlinesUseCase;
