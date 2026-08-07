/**
 * Caso de uso: atualização de uma linha de orçamento, cobrindo o fluxo do
 * endpoint `PUT /api/budget/lines/:id`.
 *
 * @module modules/budget/application/use-cases/budget-line/UpdateBudgetLineUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { ConflictError, NotFoundError } from '../../../../../errors';
import BudgetRepository from '../../../domain/repositories/BudgetRepository';

type BudgetCategory = 'custo_fixo' | 'custo_variavel' | 'investimento' | 'outro';

type UpdateBudgetLineInput = {
  id: number;
  cost_center_id?: number;
  year?: number;
  month?: number | null;
  category?: BudgetCategory;
  planned_amount?: number;
  notes?: string | null;
};

class UpdateBudgetLineUseCase extends UseCase<UpdateBudgetLineInput, any> {
  private readonly budgetRepository: BudgetRepository;

  constructor(budgetRepository: BudgetRepository) {
    super();
    this.budgetRepository = budgetRepository;
  }

  /**
   * @throws {NotFoundError} Se a linha de orçamento não existir.
   * @throws {ConflictError} Se a nova combinação `(cost_center_id, year, month, category)` já pertencer a outra linha.
   */
  async execute({ id, ...data }: UpdateBudgetLineInput) {
    const line = await this.budgetRepository.findBudgetLineById(id);
    if (!line) {
      throw new NotFoundError(`Linha de orçamento ${id} não encontrada.`);
    }

    const keyChanged = data.cost_center_id !== undefined || data.year !== undefined
      || data.month !== undefined || data.category !== undefined;

    if (keyChanged) {
      const costCenterId = data.cost_center_id ?? line.cost_center_id;
      const year = data.year ?? line.year;
      const month = data.month !== undefined ? data.month : line.month;
      const category = data.category ?? line.category;

      const existing = await this.budgetRepository.findBudgetLineByKey(costCenterId, year, month ?? null, category);
      if (existing && existing.id !== id) {
        const periodo = month ? `${year}/${String(month).padStart(2, '0')}` : `ano ${year} (linha anual)`;
        throw new ConflictError(`Já existe uma linha de orçamento para este centro de custo em ${periodo}, categoria "${category}".`);
      }
    }

    return this.budgetRepository.updateBudgetLine(id, data);
  }
}

export = UpdateBudgetLineUseCase;
