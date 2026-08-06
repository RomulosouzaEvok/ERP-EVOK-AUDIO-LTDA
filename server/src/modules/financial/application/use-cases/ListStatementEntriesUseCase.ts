import type { IReconciliationRepository } from '../../domain/repositories/ReconciliationRepository';

const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError } = require('../../../../errors');

/** Dados de entrada de `ListStatementEntriesUseCase.execute`. */
interface ListStatementEntriesInput {
  statementId: number | string;
  status?: 'pending' | 'matched' | 'ignored';
}

/** Lista os lançamentos (`BankStatementEntry`) de um extrato importado, com filtro opcional por status. */
class ListStatementEntriesUseCase extends UseCase {
  reconciliationRepository: IReconciliationRepository;

  constructor(reconciliationRepository: IReconciliationRepository) {
    super();
    this.reconciliationRepository = reconciliationRepository;
  }

  /**
   * @param {ListStatementEntriesInput} input
   * @returns {Promise<Object[]>}
   */
  async execute({ statementId, status }: ListStatementEntriesInput) {
    const statement = await this.reconciliationRepository.findStatementById(statementId);
    if (!statement) throw new NotFoundError('Extrato bancário não encontrado.');

    return this.reconciliationRepository.listEntriesByStatement(statementId, { status });
  }
}

module.exports = ListStatementEntriesUseCase;
