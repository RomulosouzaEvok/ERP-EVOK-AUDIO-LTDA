/**
 * Caso de uso: atualização de uma conta bancária, cobrindo o fluxo do
 * endpoint `PUT /api/treasury/bank-accounts/:id`.
 *
 * @module modules/treasury/application/use-cases/bank-account/UpdateBankAccountUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { ConflictError, NotFoundError } from '../../../../../errors';
import TreasuryRepository from '../../../domain/repositories/TreasuryRepository';

type UpdateBankAccountInput = {
  id: number;
  bank_name?: string;
  agency?: string;
  account_number?: string;
  account_type?: 'corrente' | 'poupanca' | 'aplicacao';
  current_balance?: number;
  manager_name?: string | null;
  manager_phone?: string | null;
  active?: boolean;
};

class UpdateBankAccountUseCase extends UseCase<UpdateBankAccountInput, any> {
  private readonly treasuryRepository: TreasuryRepository;

  constructor(treasuryRepository: TreasuryRepository) {
    super();
    this.treasuryRepository = treasuryRepository;
  }

  /**
   * @throws {NotFoundError} Se a conta bancária não existir.
   * @throws {ConflictError} Se a nova combinação agência + número já pertencer a outra conta.
   */
  async execute({ id, ...data }: UpdateBankAccountInput) {
    const account = await this.treasuryRepository.findBankAccountById(id);
    if (!account) {
      throw new NotFoundError(`Conta bancária ${id} não encontrada.`);
    }

    if (data.agency || data.account_number) {
      const agency = data.agency ?? account.agency;
      const accountNumber = data.account_number ?? account.account_number;
      const existing = await this.treasuryRepository.findBankAccountByAgencyAndNumber(agency, accountNumber);
      if (existing && existing.id !== id) {
        throw new ConflictError(`Já existe uma conta bancária cadastrada com a agência "${agency}" e número "${accountNumber}".`);
      }
    }

    return this.treasuryRepository.updateBankAccount(id, data);
  }
}

export = UpdateBankAccountUseCase;
