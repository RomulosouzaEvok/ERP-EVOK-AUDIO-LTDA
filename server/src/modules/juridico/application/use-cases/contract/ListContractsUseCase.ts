/**
 * `GET /api/jur/contracts` — lista paginada, shape resumido (sem
 * `counterparty_doc`, §0.4 da API).
 *
 * @module modules/juridico/application/use-cases/contract/ListContractsUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import ContractRepository from '../../../domain/repositories/ContractRepository';

interface ListContractsInput {
  filters: Record<string, unknown>;
  page: number;
  limit: number;
}

class ListContractsUseCase extends UseCase<ListContractsInput, any> {
  private readonly repository: ContractRepository;

  public constructor(repository: ContractRepository) {
    super();
    this.repository = repository;
  }

  public async execute({ filters, page, limit }: ListContractsInput): Promise<any> {
    const offset = (page - 1) * limit;
    const { count, rows } = await this.repository.findAndCount(filters, { limit, offset });
    return { rows, total: count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

export = ListContractsUseCase;
