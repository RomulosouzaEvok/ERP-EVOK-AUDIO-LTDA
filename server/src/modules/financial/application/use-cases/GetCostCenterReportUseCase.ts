import type { ICostCenterRepository } from '../../domain/repositories/CostCenterRepository';

const UseCase = require('../../../../shared/application/UseCase');

/** Rótulo usado no grupo agregado de lançamentos sem centro de custo (`cost_center_id IS NULL`). */
const NO_COST_CENTER_KEY = 'null';
const NO_COST_CENTER_LABEL = 'Sem centro de custo';

/**
 * Relatório de Contas a Pagar/Receber agrupado por Centro de Custo, cobrindo
 * o fluxo do endpoint `GET /api/finance/cost-centers/report?from=&to=`.
 *
 * Para cada centro de custo (mais um grupo "Sem centro de custo" agregando
 * `cost_center_id IS NULL`), retorna o total em aberto (filtrado por
 * `due_date` no período `[from, to]`) e o total já realizado (filtrado pela
 * data real de pagamento `payment_date` no período, com fallback para
 * `due_date` em registros legados sem `payment_date` — ver
 * `SequelizeCostCenterRepository`) de contas a receber e a pagar. Duas
 * queries agregadas (uma por tabela) — sem N+1 por centro de custo.
 */
class GetCostCenterReportUseCase extends UseCase {
  costCenterRepository: ICostCenterRepository;

  /**
   * @param {import('../../domain/repositories/CostCenterRepository')} costCenterRepository
   */
  constructor(costCenterRepository: ICostCenterRepository) {
    super();
    this.costCenterRepository = costCenterRepository;
  }

  /**
   * @param {Object} input
   * @param {string} input.from - Data inicial (YYYY-MM-DD).
   * @param {string} input.to - Data final (YYYY-MM-DD).
   * @returns {Promise<{
   *   period: { from: string, to: string },
   *   groups: Array<{ cost_center_id: number|null, code: string|null, name: string,
   *     receivable: { open: number, realized: number }, payable: { open: number, realized: number } }>,
   *   totals: { receivable: { open: number, realized: number }, payable: { open: number, realized: number } }
   * }>}
   */
  async execute({ from, to }: { from: string; to: string }) {
    const [receivableRows, payableRows] = await Promise.all([
      this.costCenterRepository.getCostCenterTotalsByReceivable(from, to),
      this.costCenterRepository.getCostCenterTotalsByPayable(from, to),
    ]);

    const groups = new Map<string, any>();

    const keyOf = (costCenterId: number | string | null) => (costCenterId === null || costCenterId === undefined ? NO_COST_CENTER_KEY : String(costCenterId));

    const ensureGroup = (row: { cost_center_id: number | null; code: string | null; name: string | null }) => {
      const key = keyOf(row.cost_center_id);
      if (!groups.has(key)) {
        groups.set(key, {
          cost_center_id: row.cost_center_id ?? null,
          code: row.code ?? null,
          name: row.name ?? NO_COST_CENTER_LABEL,
          receivable: { open: 0, realized: 0 },
          payable: { open: 0, realized: 0 },
        });
      }
      return groups.get(key);
    };

    for (const row of receivableRows) {
      const group = ensureGroup(row);
      group.receivable.open = Number(row.open_amount) || 0;
      group.receivable.realized = Number(row.realized_amount) || 0;
    }

    for (const row of payableRows) {
      const group = ensureGroup(row);
      group.payable.open = Number(row.open_amount) || 0;
      group.payable.realized = Number(row.realized_amount) || 0;
    }

    // Garante que o grupo "Sem centro de custo" sempre apareça, mesmo sem
    // nenhum lançamento no período (requisito de UX do relatório).
    ensureGroup({ cost_center_id: null, code: null, name: NO_COST_CENTER_LABEL });

    const sortedGroups = Array.from(groups.values()).sort((a, b) => {
      if (a.cost_center_id === null) return 1;
      if (b.cost_center_id === null) return -1;
      return String(a.name).localeCompare(String(b.name));
    });

    const totals = sortedGroups.reduce(
      (acc, group) => {
        acc.receivable.open += group.receivable.open;
        acc.receivable.realized += group.receivable.realized;
        acc.payable.open += group.payable.open;
        acc.payable.realized += group.payable.realized;
        return acc;
      },
      { receivable: { open: 0, realized: 0 }, payable: { open: 0, realized: 0 } }
    );

    return { period: { from, to }, groups: sortedGroups, totals };
  }
}

module.exports = GetCostCenterReportUseCase;
