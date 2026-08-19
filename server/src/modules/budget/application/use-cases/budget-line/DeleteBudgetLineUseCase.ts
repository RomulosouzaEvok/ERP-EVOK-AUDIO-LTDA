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
type DeleteBudgetLineResult = { warning: string | null };

class DeleteBudgetLineUseCase extends UseCase<DeleteBudgetLineInput, DeleteBudgetLineResult> {
  private readonly budgetRepository: BudgetRepository;
  private readonly clock: () => Date;

  constructor(budgetRepository: BudgetRepository, clock: () => Date = () => new Date()) {
    super();
    this.budgetRepository = budgetRepository;
    this.clock = clock;
  }

  /** @throws {NotFoundError} Se a linha de orçamento não existir. */
  async execute({ id }: DeleteBudgetLineInput) {
    const line = await this.budgetRepository.findBudgetLineById(id);
    if (!line) {
      throw new NotFoundError(`Linha de orçamento ${id} não encontrada.`);
    }
    await this.budgetRepository.deleteBudgetLine(id);
    return { warning: this.buildHistoricalWarning(line) };
  }

  private buildHistoricalWarning(line: any): string | null {
    if (!this.isClosedPlanningPeriod(line)) return null;
    const period = line.month ? `${line.year}-${String(line.month).padStart(2, '0')}` : String(line.year);
    return `Linha de orçamento ${period} excluída fisicamente; relatórios históricos orçado×realizado desse período podem perder o valor planejado.`;
  }

  private isClosedPlanningPeriod(line: any): boolean {
    const now = this.clock();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    if (Number(line.year) < currentYear) return true;
    if (Number(line.year) > currentYear) return false;
    if (line.month == null) return false;
    return Number(line.month) < currentMonth;
  }
}

export = DeleteBudgetLineUseCase;
