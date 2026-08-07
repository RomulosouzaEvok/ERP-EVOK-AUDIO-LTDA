import type { Transaction } from 'sequelize';

/**
 * Caso de uso: atualização de um lançamento contábil em rascunho (cabeçalho
 * + substituição integral dos itens), cobrindo o fluxo do endpoint
 * `PUT /api/accounting/entries/:id`.
 *
 * Só é permitido enquanto `status = 'draft'` — depois de "postado"
 * (`posted`) os itens ficam imutáveis (a única forma de desfazer é
 * `ReverseEntryUseCase`). Quando `items` é informado, TODOS os itens
 * antigos são removidos e recriados (mesmo padrão de substituição integral
 * usado em `PUT /api/sales/:id/items`) — evita diffing item a item.
 *
 * @module modules/accounting/application/use-cases/entry/UpdateEntryUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError, BusinessRuleError } from '../../../../../errors';
import AccountingRepository from '../../../domain/repositories/AccountingRepository';

const { validateEntryItemsShape } = require('../../services/validateEntryItemsShape');

interface UpdateEntryItemInput {
  account_id: number;
  cost_center_id?: number | null;
  debit?: number;
  credit?: number;
  historical?: string | null;
}

interface UpdateEntryInput {
  id: number;
  entry_date?: string;
  description?: string;
  entry_type?: 'receipt' | 'payment' | 'sales' | 'purchase' | 'payroll' | 'depreciation' | 'closing' | 'adjustment';
  items?: UpdateEntryItemInput[];
  transaction: Transaction;
}

class UpdateEntryUseCase extends UseCase<UpdateEntryInput, any> {
  private readonly accountingRepository: AccountingRepository;

  constructor(accountingRepository: AccountingRepository) {
    super();
    this.accountingRepository = accountingRepository;
  }

  /**
   * @throws {NotFoundError} Se o lançamento (ou alguma conta/centro de custo referenciado nos novos itens) não existir.
   * @throws {BusinessRuleError} Se o lançamento não estiver `draft`, ou se os novos itens violarem a forma de partida dobrada (ver `validateEntryItemsShape`).
   */
  async execute({ id, entry_date, description, entry_type, items, transaction }: UpdateEntryInput) {
    const current = await this.accountingRepository.findEntryByIdForUpdate(id, transaction);
    if (!current) {
      throw new NotFoundError('Lançamento contábil não encontrado.');
    }
    if (current.status !== 'draft') {
      throw new BusinessRuleError(`Lançamento ${current.entry_number} está "${current.status}" — apenas lançamentos em rascunho (draft) podem ser editados.`);
    }

    const headerUpdate: Record<string, unknown> = {};
    if (entry_date !== undefined) headerUpdate.entry_date = entry_date;
    if (description !== undefined) headerUpdate.description = description;
    if (entry_type !== undefined) headerUpdate.entry_type = entry_type;
    if (Object.keys(headerUpdate).length > 0) {
      await this.accountingRepository.updateEntry(id, headerUpdate, transaction);
    }

    if (items) {
      validateEntryItemsShape(items);

      for (const item of items) {
        const account = await this.accountingRepository.findAccountById(item.account_id, transaction);
        if (!account) {
          throw new NotFoundError(`Conta ${item.account_id} não encontrada no plano de contas.`);
        }
        if (!account.accept_entries) {
          throw new BusinessRuleError(`A conta "${account.code} - ${account.name}" é sintética (accept_entries=false) e não aceita lançamento direto.`);
        }
      }

      await this.accountingRepository.deleteEntryItems(id, transaction);

      for (const item of items) {
        await this.accountingRepository.createEntryItem({
          entry_id: id,
          account_id: item.account_id,
          cost_center_id: item.cost_center_id ?? null,
          debit: item.debit ?? 0,
          credit: item.credit ?? 0,
          historical: item.historical ?? null,
        }, transaction);
      }
    }

    return this.accountingRepository.findEntryById(id, transaction);
  }
}

export = UpdateEntryUseCase;
