/**
 * Caso de uso: listagem paginada de linhas de orçamento, cobrindo o fluxo do
 * endpoint `GET /api/budget/lines`.
 *
 * @module modules/budget/application/use-cases/budget-line/ListBudgetLinesUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import BudgetRepository from '../../../domain/repositories/BudgetRepository';

type ListBudgetLinesInput = {
  year?: number;
  month?: number;
  cost_center_id?: number;
  category?: string;
  page: number;
  limit: number;
  offset: number;
};

class ListBudgetLinesUseCase extends UseCase<ListBudgetLinesInput, any> {
  private readonly budgetRepository: BudgetRepository;

  constructor(budgetRepository: BudgetRepository) {
    super();
    this.budgetRepository = budgetRepository;
  }

  async execute(input: ListBudgetLinesInput) {
    const { rows, count } = await this.budgetRepository.listBudgetLines(
      {
        year: input.year, month: input.month, cost_center_id: input.cost_center_id, category: input.category,
      },
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

export = ListBudgetLinesUseCase;
