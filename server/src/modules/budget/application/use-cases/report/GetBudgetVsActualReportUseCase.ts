import type { ICostCenterRepository } from '../../../../financial/domain/repositories/CostCenterRepository';

const UseCase = require('../../../../../shared/application/UseCase');

/** Rótulo usado no grupo agregado de linhas sem centro de custo (não deveria ocorrer, `cost_center_id` é obrigatório, mas mantido por defesa). */
const NO_COST_CENTER_LABEL = 'Sem centro de custo';

/** Último dia do mês (1-12) de um ano, em formato `YYYY-MM-DD`. */
function lastDayOfMonth(year: number, month: number): string {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

/**
 * Relatório Orçado × Realizado por Centro de Custo, cobrindo o fluxo do
 * endpoint `GET /api/budget/report?year=&month=&cost_center_id=`.
 *
 * "Orçado" vem de `budget_lines` (via `BudgetRepository.getBudgetTotalsByCostCenter`,
 * que já resolve a proração de linhas anuais quando `month` é informado —
 * ver decisão documentada na migration `20260807-000250-create-budget-module.cjs`).
 *
 * "Realizado" NÃO reimplementa a agregação de contas a pagar por centro de
 * custo: reaproveita `CostCenterRepository.getCostCenterTotalsByPayable`
 * (mesma fonte de dados de `GetCostCenterReportUseCase`, módulo Financeiro),
 * usando o valor já PAGO (`realized_amount` = soma de `amount_paid`) como
 * "realizado" — Controladoria acompanha custos/despesas, não receitas,
 * então apenas o lado de contas a PAGAR entra no comparativo (contas a
 * receber ficam fora do escopo deste relatório por design).
 *
 * @module modules/budget/application/use-cases/report/GetBudgetVsActualReportUseCase
 */
class GetBudgetVsActualReportUseCase extends UseCase {
  budgetRepository: any;

  costCenterRepository: ICostCenterRepository;

  constructor(budgetRepository: any, costCenterRepository: ICostCenterRepository) {
    super();
    this.budgetRepository = budgetRepository;
    this.costCenterRepository = costCenterRepository;
  }

  /**
   * @param {Object} input
   * @param {number} input.year - Ano de referência.
   * @param {number} [input.month] - Mês (1-12); se omitido, relatório cobre o ano inteiro.
   * @param {number} [input.cost_center_id] - Filtra um único centro de custo.
   */
  async execute({ year, month, cost_center_id: costCenterId }: { year: number; month?: number | null; cost_center_id?: number | null }) {
    const from = month ? `${year}-${String(month).padStart(2, '0')}-01` : `${year}-01-01`;
    const to = month ? lastDayOfMonth(year, month) : `${year}-12-31`;

    const [plannedRows, realizedRows] = await Promise.all([
      this.budgetRepository.getBudgetTotalsByCostCenter(year, month ?? null, costCenterId ?? null),
      this.costCenterRepository.getCostCenterTotalsByPayable(from, to),
    ]);

    const groups = new Map<string, any>();

    const keyOf = (id: number | string | null) => (id === null || id === undefined ? 'null' : String(id));

    const ensureGroup = (row: { cost_center_id: number | null; code: string | null; name: string | null }) => {
      const key = keyOf(row.cost_center_id);
      if (!groups.has(key)) {
        groups.set(key, {
          cost_center_id: row.cost_center_id ?? null,
          code: row.code ?? null,
          name: row.name ?? NO_COST_CENTER_LABEL,
          planned_amount: 0,
          realized_amount: 0,
        });
      }
      return groups.get(key);
    };

    for (const row of plannedRows) {
      if (costCenterId && String(row.cost_center_id) !== String(costCenterId)) continue;
      const group = ensureGroup(row);
      group.planned_amount = Number(row.planned_amount) || 0;
    }

    for (const row of realizedRows) {
      if (costCenterId && String(row.cost_center_id) !== String(costCenterId)) continue;
      const group = ensureGroup(row);
      group.realized_amount = Number((row as any).realized_amount) || 0;
    }

    const result = Array.from(groups.values()).map((group) => {
      const variance = group.realized_amount - group.planned_amount;
      const variancePercent = group.planned_amount !== 0 ? (variance / group.planned_amount) * 100 : null;
      return { ...group, variance, variance_percent: variancePercent };
    });

    result.sort((a, b) => {
      if (a.cost_center_id === null) return 1;
      if (b.cost_center_id === null) return -1;
      return String(a.name).localeCompare(String(b.name));
    });

    const totals = result.reduce(
      (acc, group) => {
        acc.planned_amount += group.planned_amount;
        acc.realized_amount += group.realized_amount;
        return acc;
      },
      { planned_amount: 0, realized_amount: 0 },
    );
    const totalVariance = totals.realized_amount - totals.planned_amount;
    const totalVariancePercent = totals.planned_amount !== 0 ? (totalVariance / totals.planned_amount) * 100 : null;

    return {
      period: { year, month: month ?? null, from, to },
      groups: result,
      totals: { ...totals, variance: totalVariance, variance_percent: totalVariancePercent },
    };
  }
}

module.exports = GetBudgetVsActualReportUseCase;
