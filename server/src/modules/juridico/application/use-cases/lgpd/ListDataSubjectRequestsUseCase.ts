/**
 * `GET /api/jur/lgpd/data-subject-requests` — lista, shape resumido (sem
 * dados de identificação do titular, §0.4 da API).
 *
 * @module modules/juridico/application/use-cases/lgpd/ListDataSubjectRequestsUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import LgpdRequestRepository from '../../../domain/repositories/LgpdRequestRepository';

interface ListInput {
  filters: Record<string, unknown>;
  page: number;
  limit: number;
}

class ListDataSubjectRequestsUseCase extends UseCase<ListInput, any> {
  private readonly repository: LgpdRequestRepository;

  public constructor(repository: LgpdRequestRepository) {
    super();
    this.repository = repository;
  }

  public async execute({ filters, page, limit }: ListInput): Promise<any> {
    const offset = (page - 1) * limit;
    const { count, rows } = await this.repository.findAndCount(filters, { limit, offset });
    return { rows, total: count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

export = ListDataSubjectRequestsUseCase;
