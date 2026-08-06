import type { IReconciliationRepository } from '../../domain/repositories/ReconciliationRepository';

const UseCase = require('../../../../shared/application/UseCase');

/** Dados de entrada de `ListStatementsUseCase.execute`. */
interface ListStatementsInput {
  page?: number;
  limit?: number;
  offset?: number;
}

/** Lista os extratos bancários importados (`BankStatement`), paginados, mais recentes primeiro. */
class ListStatementsUseCase extends UseCase {
  reconciliationRepository: IReconciliationRepository;

  constructor(reconciliationRepository: IReconciliationRepository) {
    super();
    this.reconciliationRepository = reconciliationRepository;
  }

  /**
   * @param {ListStatementsInput} input
   * @returns {Promise<{ rows: Object[], count: number, page: number, limit: number, totalPages: number }>}
   */
  async execute({ page = 1, limit = 20, offset }: ListStatementsInput) {
    const resolvedOffset = offset ?? (page - 1) * limit;
    const { rows, count } = await this.reconciliationRepository.listStatements({ limit, offset: resolvedOffset });
    return { rows, count, page, limit, totalPages: Math.max(1, Math.ceil(count / limit)) };
  }
}

module.exports = ListStatementsUseCase;
