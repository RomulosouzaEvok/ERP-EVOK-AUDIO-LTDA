/**
 * `GET /api/ti/responsibility-terms` — lista termos (filtros: `employee_id`,
 * `asset_id`, `status`, `department_id`).
 *
 * @module modules/ti/application/use-cases/term/ListResponsibilityTermsUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import ResponsibilityTermRepository from '../../../domain/repositories/ResponsibilityTermRepository';
import { toTermDTO } from '../../../infrastructure/mappers/TermMapper';

interface Input {
  filters: Record<string, unknown>;
  page: number;
  limit: number;
}

class ListResponsibilityTermsUseCase extends UseCase<Input, any> {
  private readonly repository: ResponsibilityTermRepository;

  public constructor(repository: ResponsibilityTermRepository) {
    super();
    this.repository = repository;
  }

  public async execute({ filters, page, limit }: Input): Promise<{ rows: unknown[]; total: number; page: number; limit: number; totalPages: number }> {
    const offset = (page - 1) * limit;
    const { count, rows } = await this.repository.findAndCount(filters, { limit, offset });
    return { rows: rows.map(toTermDTO), total: count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

export = ListResponsibilityTermsUseCase;
