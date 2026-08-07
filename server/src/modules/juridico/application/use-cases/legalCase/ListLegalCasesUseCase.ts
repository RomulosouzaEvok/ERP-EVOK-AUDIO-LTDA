/**
 * `GET /api/jur/legal-cases` — lista paginada, shape resumido (sem
 * `parte_contraria`, §0.4 da API).
 *
 * @module modules/juridico/application/use-cases/legalCase/ListLegalCasesUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import LegalCaseRepository from '../../../domain/repositories/LegalCaseRepository';

interface ListLegalCasesInput {
  filters: Record<string, unknown>;
  page: number;
  limit: number;
}

class ListLegalCasesUseCase extends UseCase<ListLegalCasesInput, any> {
  private readonly repository: LegalCaseRepository;

  public constructor(repository: LegalCaseRepository) {
    super();
    this.repository = repository;
  }

  public async execute({ filters, page, limit }: ListLegalCasesInput): Promise<any> {
    const offset = (page - 1) * limit;
    const { count, rows } = await this.repository.findAndCount(filters, { limit, offset });
    return { rows, total: count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

export = ListLegalCasesUseCase;
