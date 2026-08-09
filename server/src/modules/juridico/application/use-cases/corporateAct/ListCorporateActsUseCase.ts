/**
 * `GET /api/jur/corporate-acts` — lista paginada de atos societários.
 *
 * @module modules/juridico/application/use-cases/corporateAct/ListCorporateActsUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import CorporateActRepository from '../../../domain/repositories/CorporateActRepository';
import type { ListCorporateActsInput } from '../../../domain/entities/CorporateActTypes';

class ListCorporateActsUseCase extends UseCase<ListCorporateActsInput, any> {
  private readonly repository: CorporateActRepository;

  public constructor(repository: CorporateActRepository) {
    super();
    this.repository = repository;
  }

  public async execute({ filters, page, limit }: ListCorporateActsInput): Promise<any> {
    const offset = (page - 1) * limit;
    const { count, rows } = await this.repository.findAndCount(filters, { limit, offset });
    return { rows, total: count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

export = ListCorporateActsUseCase;
