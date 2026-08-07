/**
 * `GET /api/ti/access-requests` — lista solicitações (filtros: `type`,
 * `status`, `employee_id`, `department_id`, `pending_over_days`).
 *
 * @module modules/ti/application/use-cases/accessRequest/ListAccessRequestsUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import AccessRequestRepository from '../../../domain/repositories/AccessRequestRepository';
import { toAccessRequestDTO } from '../../../infrastructure/mappers/AccessRequestMapper';

interface Input {
  filters: Record<string, unknown>;
  page: number;
  limit: number;
}

class ListAccessRequestsUseCase extends UseCase<Input, any> {
  private readonly repository: AccessRequestRepository;

  public constructor(repository: AccessRequestRepository) {
    super();
    this.repository = repository;
  }

  public async execute({ filters, page, limit }: Input): Promise<{ rows: unknown[]; total: number; page: number; limit: number; totalPages: number }> {
    const offset = (page - 1) * limit;
    const { count, rows } = await this.repository.findAndCount(filters, { limit, offset });
    return { rows: rows.map(toAccessRequestDTO), total: count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

export = ListAccessRequestsUseCase;
