/**
 * Caso de uso: criação de uma linha de orçamento, cobrindo o fluxo do
 * endpoint `POST /api/budget/lines`.
 *
 * @module modules/budget/application/use-cases/budget-line/CreateBudgetLineUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { ConflictError } from '../../../../../errors';
import BudgetRepository from '../../../domain/repositories/BudgetRepository';

type BudgetCategory = 'custo_fixo' | 'custo_variavel' | 'investimento' | 'outro';

type CreateBudgetLineInput = {
  cost_center_id: number;
  year: number;
  month?: number | null;
  category?: BudgetCategory;
  planned_amount: number;
  notes?: string | null;
};

class CreateBudgetLineUseCase extends UseCase<CreateBudgetLineInput, any> {
  private readonly budgetRepository: BudgetRepository;

  constructor(budgetRepository: BudgetRepository) {
    super();
    this.budgetRepository = budgetRepository;
  }

  /**
   * @throws {ConflictError} Se já existir linha com a mesma combinação
   * `(cost_center_id, year, month, category)` — `month` nulo é tratado como
   * "linha anual", distinta de qualquer linha mensal.
   */
  async execute(input: CreateBudgetLineInput) {
    const month = input.month ?? null;
    const category = input.category ?? 'outro';

    const existing = await this.budgetRepository.findBudgetLineByKey(input.cost_center_id, input.year, month, category);
    if (existing) {
      const periodo = month ? `${input.year}/${String(month).padStart(2, '0')}` : `ano ${input.year} (linha anual)`;
      throw new ConflictError(`Já existe uma linha de orçamento para este centro de custo em ${periodo}, categoria "${category}".`);
    }

    return this.budgetRepository.createBudgetLine({
      cost_center_id: input.cost_center_id,
      year: input.year,
      month,
      category,
      planned_amount: input.planned_amount,
      notes: input.notes ?? null,
    });
  }
}

export = CreateBudgetLineUseCase;
