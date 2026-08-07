/**
 * `POST /api/jur/legal-cases/:id/close` — encerra o processo
 * (RF-JUR-019): `won`/`lost`/`settled` (com valor/parcelas → Contas a
 * Pagar quando houver acordo, A2 de UC-53) ou `archived`. Processo
 * encerrado nunca é excluído fisicamente.
 *
 * @module modules/juridico/application/use-cases/legalCase/CloseLegalCaseUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import LegalCaseRepository from '../../../domain/repositories/LegalCaseRepository';
import AccountPayableService from '../../services/AccountPayableService';
import { ValidationError, NotFoundError } from '../../../../../errors';
import type { CloseLegalCaseInput } from '../../../domain/entities/LegalCaseTypes';

const RESOLUTIONS = ['won', 'lost', 'settled', 'archived'];

class CloseLegalCaseUseCase extends UseCase<CloseLegalCaseInput, any> {
  private readonly repository: LegalCaseRepository;
  private readonly accountPayableService: AccountPayableService;

  public constructor(repository: LegalCaseRepository, accountPayableService: AccountPayableService) {
    super();
    this.repository = repository;
    this.accountPayableService = accountPayableService;
  }

  /**
   * @throws {ValidationError} `resolution` inválido (400).
   * @throws {NotFoundError} Processo não encontrado (404).
   */
  public async execute(input: CloseLegalCaseInput): Promise<any> {
    if (!RESOLUTIONS.includes(input.resolution)) {
      throw new ValidationError(`resolution deve ser um de: ${RESOLUTIONS.join(', ')}.`);
    }

    const legalCase = await this.repository.findById(input.id);
    if (!legalCase) throw new NotFoundError(`Processo ${input.id} não encontrado.`);

    await this.repository.update(input.id, {
      status: input.resolution,
      outcome_amount: input.settlement_amount ?? null,
      outcome_installments: input.installments ?? null,
      closed_at: new Date(),
    });

    if (input.resolution === 'settled' && input.settlement_amount && input.installments && input.installments > 0) {
      const installmentAmount = Number(input.settlement_amount) / input.installments;
      for (let i = 0; i < input.installments; i += 1) {
        const dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() + i + 1);
        // eslint-disable-next-line no-await-in-loop
        await this.accountPayableService.create({
          description: `Acordo processo ${legalCase.case_number} — parcela ${i + 1}/${input.installments}`,
          amount: installmentAmount,
          due_date: dueDate.toISOString().slice(0, 10),
          category: 'Jurídico',
          legal_case_id: input.id,
          legal_expense_type: 'expense',
        });
      }
    }

    return this.repository.findById(input.id);
  }
}

export = CloseLegalCaseUseCase;
