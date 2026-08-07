/**
 * Caso de uso: busca de uma conta do Plano de Contas por id, cobrindo o
 * fluxo do endpoint `GET /api/accounting/accounts/:id`.
 *
 * @module modules/accounting/application/use-cases/account/GetAccountByIdUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../../errors';
import AccountingRepository from '../../../domain/repositories/AccountingRepository';

type GetAccountByIdInput = { id: number };

class GetAccountByIdUseCase extends UseCase<GetAccountByIdInput, any> {
  private readonly accountingRepository: AccountingRepository;

  constructor(accountingRepository: AccountingRepository) {
    super();
    this.accountingRepository = accountingRepository;
  }

  async execute({ id }: GetAccountByIdInput) {
    const account = await this.accountingRepository.findAccountById(id);
    if (!account) {
      throw new NotFoundError('Conta do plano de contas não encontrada.');
    }
    return account;
  }
}

export = GetAccountByIdUseCase;
