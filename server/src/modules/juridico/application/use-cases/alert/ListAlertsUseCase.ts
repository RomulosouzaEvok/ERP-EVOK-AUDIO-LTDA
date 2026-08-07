/**
 * `GET /api/jur/alerts` — lista consolidada de `JurLegalAlert` (§8.1).
 *
 * @module modules/juridico/application/use-cases/alert/ListAlertsUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import LegalAlertRepository from '../../../domain/repositories/LegalAlertRepository';

interface ListInput {
  filters: Record<string, unknown>;
  page: number;
  limit: number;
}

class ListAlertsUseCase extends UseCase<ListInput, any> {
  private readonly repository: LegalAlertRepository;

  public constructor(repository: LegalAlertRepository) {
    super();
    this.repository = repository;
  }

  public async execute({ filters, page, limit }: ListInput): Promise<any> {
    const offset = (page - 1) * limit;
    const { count, rows } = await this.repository.findAndCount(filters, { limit, offset });
    return { rows, total: count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

export = ListAlertsUseCase;
