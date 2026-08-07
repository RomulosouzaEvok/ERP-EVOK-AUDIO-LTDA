import type { Transaction } from 'sequelize';

/**
 * Contrato de repositório do módulo Controladoria (subárea CTR do
 * departamento Financeiro): Linhas de Orçamento (`budget_lines`) e a
 * agregação orçado × realizado usada no relatório de acompanhamento.
 *
 * A camada de aplicação (use cases) depende apenas desta interface, nunca de
 * uma implementação concreta (Sequelize) — mantém a regra de negócio
 * independente do ORM/banco.
 *
 * @module modules/budget/domain/repositories/BudgetRepository
 */
class BudgetRepository {
  // ---- Linhas de Orçamento ----

  /** Lista linhas de orçamento paginadas, com filtros opcionais de `year`/`month`/`cost_center_id`/`category`. */
  async listBudgetLines(_filters: Record<string, any>, _pagination: Record<string, any>): Promise<{ rows: any[]; count: number }> {
    throw new Error('BudgetRepository.listBudgetLines não implementado.');
  }

  /** Busca uma linha de orçamento pelo id. */
  async findBudgetLineById(_id: number): Promise<any | null> {
    throw new Error('BudgetRepository.findBudgetLineById não implementado.');
  }

  /**
   * Busca uma linha de orçamento pela chave de unicidade
   * `(cost_center_id, year, month, category)` — trata `month === null` como
   * "linha anual" (mesma semântica do índice de expressão
   * `COALESCE(month, 0)` da migration).
   */
  async findBudgetLineByKey(_costCenterId: number, _year: number, _month: number | null, _category: string): Promise<any | null> {
    throw new Error('BudgetRepository.findBudgetLineByKey não implementado.');
  }

  /** Cria uma linha de orçamento. */
  async createBudgetLine(_data: Record<string, unknown>): Promise<any> {
    throw new Error('BudgetRepository.createBudgetLine não implementado.');
  }

  /** Atualiza campos de uma linha de orçamento existente. */
  async updateBudgetLine(_id: number, _data: Record<string, unknown>): Promise<any | null> {
    throw new Error('BudgetRepository.updateBudgetLine não implementado.');
  }

  /** Exclui fisicamente uma linha de orçamento (planejamento, não histórico transacional — DELETE real permitido). */
  async deleteBudgetLine(_id: number, _transaction?: Transaction): Promise<void> {
    throw new Error('BudgetRepository.deleteBudgetLine não implementado.');
  }

  // ---- Relatório Orçado × Realizado ----

  /**
   * Agrega `budget_lines` por centro de custo para o ano informado.
   *
   * Quando `month` é `undefined`/`null`, retorna o total ANUAL de cada
   * centro de custo (linhas mensais somadas + linhas anuais pelo valor
   * cheio). Quando `month` é informado (1-12), retorna o total daquele mês
   * (linhas mensais daquele mês + linhas anuais RATEADAS por 12 — ver
   * decisão documentada na migration `20260807-000250-create-budget-module.cjs`).
   */
  async getBudgetTotalsByCostCenter(_year: number, _month?: number | null, _costCenterId?: number | null): Promise<Array<{
    cost_center_id: number | null; code: string | null; name: string | null; planned_amount: number;
  }>> {
    throw new Error('BudgetRepository.getBudgetTotalsByCostCenter não implementado.');
  }
}

export = BudgetRepository;
