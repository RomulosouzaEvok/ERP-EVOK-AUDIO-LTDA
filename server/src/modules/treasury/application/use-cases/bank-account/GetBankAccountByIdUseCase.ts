/**
 * Caso de uso: busca de uma conta bancária por id, cobrindo o fluxo do
 * endpoint `GET /api/treasury/bank-accounts/:id`.
 *
 * @module modules/treasury/application/use-cases/bank-account/GetBankAccountByIdUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../../errors';
import TreasuryRepository from '../../../domain/repositories/TreasuryRepository';

type GetBankAccountByIdInput = { id: number };

class GetBankAccountByIdUseCase extends UseCase<GetBankAccountByIdInput, any> {
  private readonly treasuryRepository: TreasuryRepository;

  constructor(treasuryRepository: TreasuryRepository) {
    super();
    this.treasuryRepository = treasuryRepository;
  }

  /** @throws {NotFoundError} Se a conta bancária não existir. */
  async execute({ id }: GetBankAccountByIdInput) {
    const account = await this.treasuryRepository.findBankAccountById(id);
    if (!account) {
      throw new NotFoundError(`Conta bancária ${id} não encontrada.`);
    }
    return account;
  }
}

export = GetBankAccountByIdUseCase;
