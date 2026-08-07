/**
 * `POST /api/jur/legal-cases/:id/costs` — lança custo do processo
 * (honorário/custas/perícia) em `AccountPayable` categoria "Jurídico",
 * vinculado ao processo (RF-JUR-018). Distingue despesa de depósito
 * judicial/recursal desde o dia 1 (`legal_expense_type`), nunca
 * confundidos.
 *
 * @module modules/juridico/application/use-cases/legalCase/RegisterCaseCostUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import LegalCaseRepository from '../../../domain/repositories/LegalCaseRepository';
import AccountPayableService from '../../services/AccountPayableService';
import { ValidationError, NotFoundError } from '../../../../../errors';
import type { RegisterCaseCostInput } from '../../../domain/entities/LegalCaseTypes';

class RegisterCaseCostUseCase extends UseCase<RegisterCaseCostInput, any> {
  private readonly repository: LegalCaseRepository;
  private readonly accountPayableService: AccountPayableService;

  public constructor(repository: LegalCaseRepository, accountPayableService: AccountPayableService) {
    super();
    this.repository = repository;
    this.accountPayableService = accountPayableService;
  }

  /**
   * @throws {ValidationError} Campos obrigatórios ausentes (400).
   * @throws {NotFoundError} Processo não encontrado (404).
   */
  public async execute(input: RegisterCaseCostInput): Promise<any> {
    if (!input.entry_type || !input.description || !input.amount || !input.due_date) {
      throw new ValidationError('entry_type, description, amount e due_date são obrigatórios.');
    }

    const legalCase = await this.repository.findById(input.legalCaseId);
    if (!legalCase) throw new NotFoundError(`Processo ${input.legalCaseId} não encontrado.`);

    return this.accountPayableService.create({
      description: input.description,
      amount: input.amount,
      due_date: input.due_date,
      category: input.category ?? 'Jurídico',
      legal_case_id: input.legalCaseId,
      legal_expense_type: input.entry_type,
    });
  }
}

export = RegisterCaseCostUseCase;
