import type { IFinancialRepository } from '../../domain/repositories/FinancialRepository';

const UseCase = require('../../../../shared/application/UseCase');

/**
 * Retorna a data (meia-noite local) do início da semana (segunda-feira) que
 * contém `date`.
 *
 * @param {Date} date
 * @returns {Date}
 */
function startOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0 = domingo, 1 = segunda, ...
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  return d;
}

/**
 * Formata uma `Date` como `YYYY-MM-DD` (sem depender de fuso horário do
 * `toISOString`, que pode voltar um dia por causa do UTC).
 *
 * @param {Date} date
 * @returns {string}
 */
function toDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calcula a projeção de fluxo de caixa (`GET
 * /api/finance/cash-flow-projection`) a partir dos títulos EM ABERTO
 * (`accounts_receivable`/`accounts_payable` com `payment_date IS NULL` e
 * `status != 'canceled'`), agrupando por semana (segunda a domingo) dentro
 * do horizonte `days` e acumulando o saldo líquido semana a semana.
 *
 * Títulos vencidos e não pagos (`due_date < hoje`) são somados à parte no
 * bucket `overdue` do retorno, sem entrar nas semanas do horizonte futuro.
 */
class GetCashFlowProjectionUseCase extends UseCase {
  /**
   * @param {import('../../domain/repositories/FinancialRepository')} financialRepository
   */
  financialRepository: IFinancialRepository;

  constructor(financialRepository: IFinancialRepository) {
    super();
    this.financialRepository = financialRepository;
  }

  /**
   * @param {Object} input
   * @param {number} input.days - Horizonte em dias (7 a 90, validado no schema Zod).
   * @returns {Promise<{
   *   horizon_days: number,
   *   totals: { receivable: number, payable: number, net: number, overdue_receivable: number, overdue_payable: number },
   *   due_next_7_days: { receivable: number, payable: number },
   *   weeks: Array<{ week_start: string, week_end: string, receivable: number, payable: number, net: number, cumulative_net: number }>
   * }>}
   */
  async execute({ days }: { days?: number }) {
    const horizonDays = days || 30;
    const {
      receivableRows,
      payableRows,
      overdueReceivable,
      overduePayable
    } = await this.financialRepository.getOpenTitlesForProjection(horizonDays);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const horizonEnd = new Date(today);
    horizonEnd.setDate(horizonEnd.getDate() + horizonDays);
    const next7End = new Date(today);
    next7End.setDate(next7End.getDate() + 7);

    // Constrói os buckets semanais (segunda a domingo) cobrindo do início da
    // semana de hoje até o início da semana em que o horizonte termina.
    const weekBuckets = new Map();
    let cursor = startOfWeek(today);
    const lastWeekStart = startOfWeek(horizonEnd);
    while (cursor <= lastWeekStart) {
      const weekEnd = new Date(cursor);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekBuckets.set(toDateOnly(cursor), {
        week_start: toDateOnly(cursor),
        week_end: toDateOnly(weekEnd),
        receivable: 0,
        payable: 0
      });
      cursor = new Date(cursor);
      cursor.setDate(cursor.getDate() + 7);
    }

    let totalReceivable = 0;
    let totalPayable = 0;
    let dueNext7Receivable = 0;
    let dueNext7Payable = 0;

    for (const row of receivableRows) {
      const amount = Number(row.amount) || 0;
      totalReceivable += amount;
      const dueDate = new Date(row.due_date);
      if (dueDate < next7End) dueNext7Receivable += amount;
      const bucketKey = toDateOnly(startOfWeek(dueDate));
      const bucket = weekBuckets.get(bucketKey);
      if (bucket) bucket.receivable += amount;
    }

    for (const row of payableRows) {
      const amount = Number(row.amount) || 0;
      totalPayable += amount;
      const dueDate = new Date(row.due_date);
      if (dueDate < next7End) dueNext7Payable += amount;
      const bucketKey = toDateOnly(startOfWeek(dueDate));
      const bucket = weekBuckets.get(bucketKey);
      if (bucket) bucket.payable += amount;
    }

    let cumulativeNet = 0;
    const weeks = Array.from(weekBuckets.values())
      .sort((a, b) => (a.week_start < b.week_start ? -1 : 1))
      .map((bucket) => {
        const net = bucket.receivable - bucket.payable;
        cumulativeNet += net;
        return {
          week_start: bucket.week_start,
          week_end: bucket.week_end,
          receivable: bucket.receivable,
          payable: bucket.payable,
          net,
          cumulative_net: cumulativeNet
        };
      });

    return {
      horizon_days: horizonDays,
      totals: {
        receivable: totalReceivable,
        payable: totalPayable,
        net: totalReceivable - totalPayable,
        overdue_receivable: overdueReceivable,
        overdue_payable: overduePayable
      },
      due_next_7_days: {
        receivable: dueNext7Receivable,
        payable: dueNext7Payable
      },
      weeks
    };
  }
}

module.exports = GetCashFlowProjectionUseCase;
