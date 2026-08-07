/**
 * Caso de uso: exclusão física de uma linha de orçamento, cobrindo o fluxo do
 * endpoint `DELETE /api/budget/lines/:id`.
 *
 * `budget_lines` é artefato de planejamento (não histórico transacional
 * imutável) — DELETE físico é aceitável aqui, diferente da maioria das
 * tabelas do projeto (`CLAUDE.md` §7).
 *
 * @module modules/budget/application/use-cases/budget-line/DeleteBudgetLineUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../../errors';
import BudgetRepository from '../../../domain/repositories/BudgetRepository';

type DeleteBudgetLineInput = { id: number };

class DeleteBudgetLineUseCase extends UseCase<DeleteBudgetLineInput, void> {
  private readonly budgetRepository: BudgetRepository;

  constructor(budgetRepository: BudgetRepository) {
    super();
    this.budgetRepository = budgetRepository;
  }

  /** @throws {NotFoundError} Se a linha de orçamento não existir. */
  async execute({ id }: DeleteBudgetLineInput) {
    const line = await this.budgetRepository.findBudgetLineById(id);
    if (!line) {
      throw new NotFoundError(`Linha de orçamento ${id} não encontrada.`);
    }
    await this.budgetRepository.deleteBudgetLine(id);
  }
}

export = DeleteBudgetLineUseCase;
