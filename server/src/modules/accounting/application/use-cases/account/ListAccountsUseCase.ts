/**
 * Caso de uso: listagem paginada de contas do Plano de Contas, cobrindo o
 * fluxo do endpoint `GET /api/accounting/accounts`.
 *
 * @module modules/accounting/application/use-cases/account/ListAccountsUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import AccountingRepository from '../../../domain/repositories/AccountingRepository';

type ListAccountsInput = {
  account_type?: string;
  active?: boolean;
  parent_id?: number | null;
  page?: number;
  limit?: number;
  offset?: number;
};

class ListAccountsUseCase extends UseCase<ListAccountsInput, any> {
  private readonly accountingRepository: AccountingRepository;

  constructor(accountingRepository: AccountingRepository) {
    super();
    this.accountingRepository = accountingRepository;
  }

  async execute({ account_type, active, parent_id, page = 1, limit = 100, offset = 0 }: ListAccountsInput = {}) {
    const { rows, count } = await this.accountingRepository.listAccounts(
      { account_type, active, parent_id },
      { limit, offset },
    );
    return { rows, count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

export = ListAccountsUseCase;
