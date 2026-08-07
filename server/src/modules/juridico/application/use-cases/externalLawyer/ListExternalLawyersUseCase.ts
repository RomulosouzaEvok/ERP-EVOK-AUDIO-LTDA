/**
 * `GET /api/jur/external-lawyers` — lista paginada.
 *
 * @module modules/juridico/application/use-cases/externalLawyer/ListExternalLawyersUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import ExternalLawyerRepository from '../../../domain/repositories/ExternalLawyerRepository';

interface ListExternalLawyersInput {
  filters: Record<string, unknown>;
  page: number;
  limit: number;
}

class ListExternalLawyersUseCase extends UseCase<ListExternalLawyersInput, any> {
  private readonly repository: ExternalLawyerRepository;

  public constructor(repository: ExternalLawyerRepository) {
    super();
    this.repository = repository;
  }

  public async execute({ filters, page, limit }: ListExternalLawyersInput): Promise<any> {
    const offset = (page - 1) * limit;
    const { count, rows } = await this.repository.findAndCount(filters, { limit, offset });
    return { rows, total: count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

export = ListExternalLawyersUseCase;
