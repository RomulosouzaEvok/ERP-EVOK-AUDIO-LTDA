/**
 * Caso de uso: busca de uma linha de orçamento por id, cobrindo o fluxo do
 * endpoint `GET /api/budget/lines/:id`.
 *
 * @module modules/budget/application/use-cases/budget-line/GetBudgetLineByIdUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../../errors';
import BudgetRepository from '../../../domain/repositories/BudgetRepository';

type GetBudgetLineByIdInput = { id: number };

class GetBudgetLineByIdUseCase extends UseCase<GetBudgetLineByIdInput, any> {
  private readonly budgetRepository: BudgetRepository;

  constructor(budgetRepository: BudgetRepository) {
    super();
    this.budgetRepository = budgetRepository;
  }

  /** @throws {NotFoundError} Se a linha de orçamento não existir. */
  async execute({ id }: GetBudgetLineByIdInput) {
    const line = await this.budgetRepository.findBudgetLineById(id);
    if (!line) {
      throw new NotFoundError(`Linha de orçamento ${id} não encontrada.`);
    }
    return line;
  }
}

export = GetBudgetLineByIdUseCase;
