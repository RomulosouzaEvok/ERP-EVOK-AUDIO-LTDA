import type { Transaction } from 'sequelize';
import type { IReconciliationRepository } from '../../domain/repositories/ReconciliationRepository';

const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError, BusinessRuleError } = require('../../../../errors');

/** Dados de entrada de `IgnoreEntryUseCase.execute`. */
interface IgnoreEntryInput {
  entryId: number | string;
  transaction: Transaction;
}

/**
 * Marca um lançamento pendente do extrato como `ignored` (ex.: tarifa
 * bancária, transferência entre contas próprias — nada a conciliar). Não
 * afeta nenhuma conta a pagar/receber.
 */
class IgnoreEntryUseCase extends UseCase {
  reconciliationRepository: IReconciliationRepository;

  constructor(reconciliationRepository: IReconciliationRepository) {
    super();
    this.reconciliationRepository = reconciliationRepository;
  }

  /**
   * @param {IgnoreEntryInput} input
   * @returns {Promise<Object>}
   */
  async execute({ entryId, transaction }: IgnoreEntryInput) {
    const entry = await this.reconciliationRepository.findEntryByIdForUpdate(entryId, transaction);
    if (!entry) throw new NotFoundError('Lançamento do extrato não encontrado.');

    if (entry.status !== 'pending') {
      const statusLabel = entry.status === 'matched' ? 'conciliado' : 'ignorado';
      throw new BusinessRuleError(`Este lançamento já foi ${statusLabel} e não pode ser ignorado.`);
    }

    return this.reconciliationRepository.updateEntry(entryId, { status: 'ignored' }, transaction);
  }
}

module.exports = IgnoreEntryUseCase;
