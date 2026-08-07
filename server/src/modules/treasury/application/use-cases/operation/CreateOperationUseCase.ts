/**
 * Caso de uso: criação de uma operação financeira (empréstimo, aplicação,
 * financiamento ou leasing), cobrindo o fluxo do endpoint
 * `POST /api/treasury/financial-operations`.
 *
 * @module modules/treasury/application/use-cases/operation/CreateOperationUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { ConflictError, BusinessRuleError } from '../../../../../errors';
import TreasuryRepository from '../../../domain/repositories/TreasuryRepository';

type CreateOperationInput = {
  operation_type: 'loan' | 'investment' | 'financing' | 'leasing';
  institution: string;
  contract_number: string;
  amount: number;
  interest_rate?: number | null;
  start_date: string;
  end_date?: string | null;
  guarantee_type?: 'aval' | 'fianca' | 'alienacao' | 'recebiveis' | 'none';
  notes?: string | null;
};

class CreateOperationUseCase extends UseCase<CreateOperationInput, any> {
  private readonly treasuryRepository: TreasuryRepository;

  constructor(treasuryRepository: TreasuryRepository) {
    super();
    this.treasuryRepository = treasuryRepository;
  }

  /**
   * @throws {ConflictError} Se já existir operação com o mesmo `contract_number`.
   * @throws {BusinessRuleError} Se `end_date` for informada e for anterior a `start_date`.
   */
  async execute(input: CreateOperationInput) {
    const existing = await this.treasuryRepository.findOperationByContractNumber(input.contract_number);
    if (existing) {
      throw new ConflictError(`Já existe uma operação financeira com o contrato "${input.contract_number}".`);
    }

    if (input.end_date && new Date(input.end_date) < new Date(input.start_date)) {
      throw new BusinessRuleError('end_date não pode ser anterior a start_date.');
    }

    return this.treasuryRepository.createOperation({
      operation_type: input.operation_type,
      institution: input.institution,
      contract_number: input.contract_number,
      amount: input.amount,
      interest_rate: input.interest_rate ?? null,
      start_date: input.start_date,
      end_date: input.end_date ?? null,
      guarantee_type: input.guarantee_type ?? 'none',
      notes: input.notes ?? null,
      status: 'active',
    });
  }
}

export = CreateOperationUseCase;
