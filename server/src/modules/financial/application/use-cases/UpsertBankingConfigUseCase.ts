import type { ICnabRepository } from '../../domain/repositories/CnabRepository';

const UseCase = require('../../../../shared/application/UseCase');
const { ValidationError } = require('../../../../errors');

/** Dados de entrada de `UpsertBankingConfigUseCase.execute` — todos os campos obrigatórios da configuração bancária (id=1, singleton). */
interface UpsertBankingConfigInput {
  bank_code: string;
  bank_name: string;
  agency: string;
  agency_dv?: string | null;
  account_number: string;
  account_dv?: string | null;
  agency_account_dv?: string | null;
  covenant_code: string;
  wallet_code: string;
  company_document: string;
  company_legal_name: string;
}

/**
 * Cria/atualiza a configuração bancária singleton (id=1) da empresa. Nunca
 * altera os contadores (`next_our_number`/`next_remittance_number`) — esses
 * só avançam via `GenerateRemittanceUseCase`.
 */
class UpsertBankingConfigUseCase extends UseCase {
  cnabRepository: ICnabRepository;

  constructor(cnabRepository: ICnabRepository) {
    super();
    this.cnabRepository = cnabRepository;
  }

  /**
   * @param {UpsertBankingConfigInput} input
   * @returns {Promise<Object>}
   */
  async execute(input: UpsertBankingConfigInput) {
    const required: Array<keyof UpsertBankingConfigInput> = [
      'bank_code', 'bank_name', 'agency', 'account_number', 'covenant_code',
      'wallet_code', 'company_document', 'company_legal_name',
    ];
    for (const field of required) {
      if (!input[field] || !String(input[field]).trim()) {
        throw new ValidationError(`Campo obrigatório ausente: ${field}.`);
      }
    }

    return this.cnabRepository.createOrUpdateBankingConfig({
      bank_code: input.bank_code,
      bank_name: input.bank_name,
      agency: input.agency,
      agency_dv: input.agency_dv ?? null,
      account_number: input.account_number,
      account_dv: input.account_dv ?? null,
      agency_account_dv: input.agency_account_dv ?? null,
      covenant_code: input.covenant_code,
      wallet_code: input.wallet_code,
      company_document: input.company_document,
      company_legal_name: input.company_legal_name,
    });
  }
}

module.exports = UpsertBankingConfigUseCase;
