/**
 * Caso de uso: listagem paginada de lançamentos contábeis, cobrindo o fluxo
 * do endpoint `GET /api/accounting/entries`.
 *
 * @module modules/accounting/application/use-cases/entry/ListEntriesUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import AccountingRepository from '../../../domain/repositories/AccountingRepository';

type ListEntriesInput = {
  status?: string;
  entry_type?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
  offset?: number;
};

class ListEntriesUseCase extends UseCase<ListEntriesInput, any> {
  private readonly accountingRepository: AccountingRepository;

  constructor(accountingRepository: AccountingRepository) {
    super();
    this.accountingRepository = accountingRepository;
  }

  async execute({ status, entry_type, date_from, date_to, page = 1, limit = 20, offset = 0 }: ListEntriesInput = {}) {
    const { rows, count } = await this.accountingRepository.listEntries(
      { status, entry_type, date_from, date_to },
      { limit, offset },
    );
    return { rows, count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

export = ListEntriesUseCase;
