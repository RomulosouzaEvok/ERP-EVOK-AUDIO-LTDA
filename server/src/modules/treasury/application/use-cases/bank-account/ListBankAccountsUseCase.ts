/**
 * Caso de uso: listagem paginada de contas bancárias, cobrindo o fluxo do
 * endpoint `GET /api/treasury/bank-accounts`.
 *
 * @module modules/treasury/application/use-cases/bank-account/ListBankAccountsUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import TreasuryRepository from '../../../domain/repositories/TreasuryRepository';

type ListBankAccountsInput = {
  account_type?: 'corrente' | 'poupanca' | 'aplicacao';
  active?: boolean;
  page: number;
  limit: number;
  offset: number;
};

class ListBankAccountsUseCase extends UseCase<ListBankAccountsInput, any> {
  private readonly treasuryRepository: TreasuryRepository;

  constructor(treasuryRepository: TreasuryRepository) {
    super();
    this.treasuryRepository = treasuryRepository;
  }

  async execute(input: ListBankAccountsInput) {
    const { rows, count } = await this.treasuryRepository.listBankAccounts(
      { account_type: input.account_type, active: input.active },
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

export = ListBankAccountsUseCase;
