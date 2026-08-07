import type { Transaction } from 'sequelize';

/**
 * Caso de uso: estorno de um lançamento contábil já postado, cobrindo o
 * fluxo do endpoint dedicado `PATCH /api/accounting/entries/:id/reverse`
 * (`posted -> reversed`).
 *
 * NÃO apaga nem edita o lançamento original — mantém o histórico contábil
 * imutável. Em vez disso, cria automaticamente um NOVO lançamento
 * (`entry_type: 'adjustment'`, já `posted`, com `reversal_of_id` apontando
 * para o original) com débito/crédito de cada item INVERTIDOS em relação
 * ao original, e marca o original como `status: 'reversed'`. O novo
 * lançamento nasce balanceado por construção (mesma soma do original, só
 * com os lados trocados), então não precisa passar por `PostEntryUseCase`.
 *
 * @module modules/accounting/application/use-cases/entry/ReverseEntryUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError, BusinessRuleError } from '../../../../../errors';
import AccountingRepository from '../../../domain/repositories/AccountingRepository';

interface ReverseEntryInput {
  id: number;
  userId: number;
  transaction: Transaction;
}

class ReverseEntryUseCase extends UseCase<ReverseEntryInput, any> {
  private readonly accountingRepository: AccountingRepository;

  constructor(accountingRepository: AccountingRepository) {
    super();
    this.accountingRepository = accountingRepository;
  }

  /**
   * @throws {NotFoundError} Se o lançamento não existir.
   * @throws {BusinessRuleError} Se o lançamento não estiver `posted` (só um lançamento contabilizado pode ser estornado).
   * @returns O lançamento original (agora `reversed`) e o novo lançamento de estorno (`reversalEntry`).
   */
  async execute({ id, userId, transaction }: ReverseEntryInput) {
    const original = await this.accountingRepository.findEntryByIdForUpdate(id, transaction);
    if (!original) {
      throw new NotFoundError('Lançamento contábil não encontrado.');
    }
    if (original.status !== 'posted') {
      throw new BusinessRuleError(`Lançamento ${original.entry_number} está "${original.status}" — apenas lançamentos contabilizados (posted) podem ser estornados.`);
    }

    const originalItems = await this.accountingRepository.findEntryItems(id, transaction);

    const sequential = (await this.accountingRepository.countEntries(transaction)) + 1;
    const reversalEntryNumber = `LC-${String(sequential).padStart(6, '0')}`;
    const today = new Date().toISOString().slice(0, 10);

    const reversalEntry = await this.accountingRepository.createEntry({
      entry_number: reversalEntryNumber,
      entry_date: today,
      description: `Estorno do lançamento ${original.entry_number} — ${original.description}`,
      entry_type: 'adjustment',
      status: 'posted',
      created_by: userId,
      approved_by: userId,
      approved_at: new Date(),
      reversal_of_id: original.id,
    }, transaction);

    for (const item of originalItems) {
      await this.accountingRepository.createEntryItem({
        entry_id: reversalEntry.id,
        account_id: item.account_id,
        cost_center_id: item.cost_center_id ?? null,
        // Inverte débito/crédito — a essência do estorno em partida dobrada.
        debit: item.credit,
        credit: item.debit,
        historical: item.historical ? `Estorno: ${item.historical}` : `Estorno do lançamento ${original.entry_number}`,
      }, transaction);
    }

    await this.accountingRepository.updateEntry(id, { status: 'reversed' }, transaction);

    const [updatedOriginal, fullReversalEntry] = await Promise.all([
      this.accountingRepository.findEntryById(id, transaction),
      this.accountingRepository.findEntryById(reversalEntry.id, transaction),
    ]);

    return { original: updatedOriginal, reversalEntry: fullReversalEntry };
  }
}

export = ReverseEntryUseCase;
