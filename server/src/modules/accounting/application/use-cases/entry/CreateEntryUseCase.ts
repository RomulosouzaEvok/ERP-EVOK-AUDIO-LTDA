import type { Transaction } from 'sequelize';

/**
 * Caso de uso: criação de um lançamento contábil (`status: draft`) com seus
 * itens, cobrindo o fluxo do endpoint `POST /api/accounting/entries`.
 *
 * O número do lançamento (`entry_number`) é sequencial, no formato
 * `LC-000001` (calculado por contagem — mesma limitação de concorrência já
 * documentada em `RfqRepository.countRfqsInYear`: sob alta concorrência,
 * duas criações simultâneas poderiam colidir no número; aceitável neste
 * módulo pelo mesmo motivo do RFQ — volume baixo, um único setor contábil
 * operando).
 *
 * O lançamento nasce SEMPRE `draft`, mesmo com itens já balanceados — a
 * verificação de partida dobrada (débito = crédito) só acontece ao "postar"
 * (`PostEntryUseCase`), nunca na criação, para permitir montar o lançamento
 * incrementalmente.
 *
 * @module modules/accounting/application/use-cases/entry/CreateEntryUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError, BusinessRuleError } from '../../../../../errors';
import AccountingRepository from '../../../domain/repositories/AccountingRepository';

const { validateEntryItemsShape } = require('../../services/validateEntryItemsShape');

interface CreateEntryItemInput {
  account_id: number;
  cost_center_id?: number | null;
  debit?: number;
  credit?: number;
  historical?: string | null;
}

interface CreateEntryInput {
  entry_date: string;
  description: string;
  entry_type: 'receipt' | 'payment' | 'sales' | 'purchase' | 'payroll' | 'depreciation' | 'closing' | 'adjustment';
  items: CreateEntryItemInput[];
  userId: number;
  transaction: Transaction;
}

class CreateEntryUseCase extends UseCase<CreateEntryInput, any> {
  private readonly accountingRepository: AccountingRepository;

  constructor(accountingRepository: AccountingRepository) {
    super();
    this.accountingRepository = accountingRepository;
  }

  /**
   * @throws {BusinessRuleError} Se `items` estiver vazio, se alguma linha tiver débito e crédito preenchidos (ou nenhum dos dois), se alguma conta referenciada não aceitar lançamento direto (`accept_entries=false`) ou estiver desativada (`active=false`).
   * @throws {NotFoundError} Se algum `account_id`/`cost_center_id` referenciado não existir.
   */
  async execute({ entry_date, description, entry_type, items, userId, transaction }: CreateEntryInput) {
    validateEntryItemsShape(items);

    for (const item of items) {
      const account = await this.accountingRepository.findAccountById(item.account_id, transaction);
      if (!account) {
        throw new NotFoundError(`Conta ${item.account_id} não encontrada no plano de contas.`);
      }
      if (!account.accept_entries) {
        throw new BusinessRuleError(`A conta "${account.code} - ${account.name}" é sintética (accept_entries=false) e não aceita lançamento direto.`);
      }
      if (!account.active) {
        throw new BusinessRuleError(`A conta "${account.code} - ${account.name}" está desativada e não aceita novo lançamento.`);
      }
    }

    const sequential = (await this.accountingRepository.countEntries(transaction)) + 1;
    const entryNumber = `LC-${String(sequential).padStart(6, '0')}`;

    const entry = await this.accountingRepository.createEntry({
      entry_number: entryNumber,
      entry_date,
      description,
      entry_type,
      status: 'draft',
      created_by: userId,
    }, transaction);

    for (const item of items) {
      await this.accountingRepository.createEntryItem({
        entry_id: entry.id,
        account_id: item.account_id,
        cost_center_id: item.cost_center_id ?? null,
        debit: item.debit ?? 0,
        credit: item.credit ?? 0,
        historical: item.historical ?? null,
      }, transaction);
    }

    return this.accountingRepository.findEntryById(entry.id, transaction);
  }
}

export = CreateEntryUseCase;
