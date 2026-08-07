/**
 * `GET /api/jur/lgpd/processing-activities` — lista RoPA (RF-JUR-035).
 *
 * @module modules/juridico/application/use-cases/lgpd/ListProcessingActivitiesUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import LgpdActivityRepository from '../../../domain/repositories/LgpdActivityRepository';

interface ListInput {
  filters: Record<string, unknown>;
  page: number;
  limit: number;
}

class ListProcessingActivitiesUseCase extends UseCase<ListInput, any> {
  private readonly repository: LgpdActivityRepository;

  public constructor(repository: LgpdActivityRepository) {
    super();
    this.repository = repository;
  }

  public async execute({ filters, page, limit }: ListInput): Promise<any> {
    const offset = (page - 1) * limit;
    const { count, rows } = await this.repository.findAndCount(filters, { limit, offset });
    return { rows, total: count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

export = ListProcessingActivitiesUseCase;
