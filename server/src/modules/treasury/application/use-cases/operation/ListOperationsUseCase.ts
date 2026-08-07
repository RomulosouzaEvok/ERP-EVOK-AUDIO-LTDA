/**
 * Caso de uso: listagem paginada de operações financeiras, cobrindo o fluxo
 * do endpoint `GET /api/treasury/financial-operations`.
 *
 * @module modules/treasury/application/use-cases/operation/ListOperationsUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import TreasuryRepository from '../../../domain/repositories/TreasuryRepository';

type ListOperationsInput = {
  status?: 'active' | 'settled' | 'canceled';
  operation_type?: 'loan' | 'investment' | 'financing' | 'leasing';
  page: number;
  limit: number;
  offset: number;
};

class ListOperationsUseCase extends UseCase<ListOperationsInput, any> {
  private readonly treasuryRepository: TreasuryRepository;

  constructor(treasuryRepository: TreasuryRepository) {
    super();
    this.treasuryRepository = treasuryRepository;
  }

  async execute(input: ListOperationsInput) {
    const { rows, count } = await this.treasuryRepository.listOperations(
      { status: input.status, operation_type: input.operation_type },
      { limit: input.limit, offset: input.offset },
    );

    return {
      rows,
      count,
      page: input.page,
      limit: input.limit,
      totalPages: Math.max(1, Math.ceil(count / input.limit)),
    };
  }
}

export = ListOperationsUseCase;
