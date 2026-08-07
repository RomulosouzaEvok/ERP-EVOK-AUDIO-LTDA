/**
 * Caso de uso: criação de uma conta bancária, cobrindo o fluxo do endpoint
 * `POST /api/treasury/bank-accounts`.
 *
 * @module modules/treasury/application/use-cases/bank-account/CreateBankAccountUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { ConflictError } from '../../../../../errors';
import TreasuryRepository from '../../../domain/repositories/TreasuryRepository';

type CreateBankAccountInput = {
  bank_name: string;
  agency: string;
  account_number: string;
  account_type: 'corrente' | 'poupanca' | 'aplicacao';
  current_balance?: number;
  manager_name?: string | null;
  manager_phone?: string | null;
  active?: boolean;
};

class CreateBankAccountUseCase extends UseCase<CreateBankAccountInput, any> {
  private readonly treasuryRepository: TreasuryRepository;

  constructor(treasuryRepository: TreasuryRepository) {
    super();
    this.treasuryRepository = treasuryRepository;
  }

  /**
   * @throws {ConflictError} Se já existir conta com a mesma combinação agência + número.
   */
  async execute(input: CreateBankAccountInput) {
    const existing = await this.treasuryRepository.findBankAccountByAgencyAndNumber(input.agency, input.account_number);
    if (existing) {
      throw new ConflictError(`Já existe uma conta bancária cadastrada com a agência "${input.agency}" e número "${input.account_number}".`);
    }

    return this.treasuryRepository.createBankAccount({
      bank_name: input.bank_name,
      agency: input.agency,
      account_number: input.account_number,
      account_type: input.account_type,
      current_balance: input.current_balance ?? 0,
      manager_name: input.manager_name ?? null,
      manager_phone: input.manager_phone ?? null,
      active: input.active ?? true,
    });
  }
}

export = CreateBankAccountUseCase;
