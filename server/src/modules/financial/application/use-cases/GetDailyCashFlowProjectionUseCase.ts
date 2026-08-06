import type { IFinancialRepository } from '../../domain/repositories/FinancialRepository';

const UseCase = require('../../../../shared/application/UseCase');

/**
 * Formata uma `Date` como `YYYY-MM-DD` (sem depender de fuso horário do
 * `toISOString`, que pode voltar um dia por causa do UTC) — mesma função de
 * `GetCashFlowProjectionUseCase`.
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
 * Normaliza um valor de coluna `DATEONLY` (`due_date`) vindo de
 * `sequelize.query(..., { type: QueryTypes.SELECT })` para uma `Date` à
 * meia-noite no fuso LOCAL do processo, representando o calendário correto
 * independente de como o driver `pg` devolveu o valor:
 * - `string` `'YYYY-MM-DD'` → parseada diretamente pelos componentes (nunca
 *   via `new Date('YYYY-MM-DD')`, que o motor JS interpreta como UTC e pode
 *   "voltar" um dia em fusos negativos como `America/Sao_Paulo`, UTC-3).
 * - `Date` (node-postgres tipicamente devolve DATE como meia-noite UTC) →
 *   reconstruída a partir dos getters UTC, pelo mesmo motivo acima.
 *
 * @param {string|Date} input
 * @returns {Date}
 */
function toCalendarDate(input: string | Date): Date {
  if (input instanceof Date) {
    return new Date(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate());
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(input));
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  const fallback = new Date(input);
  return new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate());
}

/**
 * Calcula a projeção de fluxo de caixa DIÁRIA (`GET
 * /api/finance/cashflow/projection`) — o "dado de decisão do CFO": série dia
 * a dia com saldo acumulado a partir de um `opening_balance` informado,
 * entradas/saídas previstas (títulos em aberto por `due_date`) e o menor
 * saldo projetado no horizonte (e em que dia ocorre), para antecipar risco
 * de caixa negativo.
 *
 * Reaproveita `financialRepository.getOpenTitlesForProjection(days)` (mesma
 * query agregada de `GetCashFlowProjectionUseCase`, sem N+1): os títulos
 * VENCIDOS e não pagos (`overdue`) são somados ao dia 0 (hoje) da série,
 * pois já deveriam ter movimentado o caixa e afetam o saldo real disponível
 * hoje — expostos também separadamente em `overdue` para transparência.
 *
 * A série cobre `[hoje, hoje + days]` inclusive (days + 1 pontos), o mesmo
 * intervalo `BETWEEN CURRENT_DATE AND CURRENT_DATE + days` já usado na
 * query de títulos em aberto.
 */
class GetDailyCashFlowProjectionUseCase extends UseCase {
  financialRepository: IFinancialRepository;

  /**
   * @param {import('../../domain/repositories/FinancialRepository')} financialRepository
   */
  constructor(financialRepository: IFinancialRepository) {
    super();
    this.financialRepository = financialRepository;
  }

  /**
   * @param {Object} input
   * @param {number} input.days - Horizonte em dias (30, 60 ou 90, validado no schema Zod).
   * @param {number} [input.opening_balance] - Saldo inicial de caixa informado pelo usuário (padrão 0).
   * @returns {Promise<{
   *   horizon_days: number,
   *   opening_balance: number,
   *   overdue: { receivable: number, payable: number },
   *   series: Array<{ date: string, day_index: number, receivable: number, payable: number, net: number, balance: number }>,
   *   summary: { lowest_balance: { date: string, balance: number }, final_balance: number }
   * }>}
   */
  async execute({ days, opening_balance = 0 }: { days: number; opening_balance?: number }) {
    const horizonDays = days;
    const openingBalance = Number(opening_balance) || 0;

    const {
      receivableRows,
      payableRows,
      overdueReceivable,
      overduePayable,
    } = await this.financialRepository.getOpenTitlesForProjection(horizonDays);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // days + 1 pontos: hoje (dia 0) até hoje + horizonDays (inclusive),
    // mesmo intervalo coberto pela query de títulos em aberto.
    const buckets: Array<{ date: string; receivable: number; payable: number }> = [];
    for (let i = 0; i <= horizonDays; i += 1) {
      const bucketDate = new Date(today);
      bucketDate.setDate(bucketDate.getDate() + i);
      buckets.push({ date: toDateOnly(bucketDate), receivable: 0, payable: 0 });
    }

    const dayIndexOf = (dueDateInput: string | Date): number => {
      const dueDate = toCalendarDate(dueDateInput);
      const diffMs = dueDate.getTime() - today.getTime();
      return Math.round(diffMs / 86_400_000);
    };

    for (const row of receivableRows) {
      const idx = dayIndexOf(row.due_date);
      if (idx >= 0 && idx <= horizonDays) {
        buckets[idx].receivable += Number(row.amount) || 0;
      }
    }

    for (const row of payableRows) {
      const idx = dayIndexOf(row.due_date);
      if (idx >= 0 && idx <= horizonDays) {
        buckets[idx].payable += Number(row.amount) || 0;
      }
    }

    // Títulos vencidos (due_date < hoje) são dobrados no dia 0 — cash real
    // ainda não movimentado, mas que já deveria ter sido.
    buckets[0].receivable += overdueReceivable;
    buckets[0].payable += overduePayable;

    let balance = openingBalance;
    let lowest: { date: string; balance: number } | null = null;

    // O saldo do dia 0 já reflete o `opening_balance` mais as movimentações
    // previstas para hoje (entradas/saídas com vencimento hoje + títulos
    // vencidos) — "menor saldo do período" é sempre calculado sobre os
    // saldos APÓS a movimentação de cada dia, nunca sobre o `opening_balance`
    // isolado (que é apenas o ponto de partida informado pelo usuário).
    const series = buckets.map((bucket, index) => {
      const net = bucket.receivable - bucket.payable;
      balance += net;
      if (!lowest || balance < lowest.balance) {
        lowest = { date: bucket.date, balance };
      }
      return {
        date: bucket.date,
        day_index: index,
        receivable: bucket.receivable,
        payable: bucket.payable,
        net,
        balance,
      };
    });

    return {
      horizon_days: horizonDays,
      opening_balance: openingBalance,
      overdue: { receivable: overdueReceivable, payable: overduePayable },
      series,
      summary: {
        lowest_balance: lowest,
        final_balance: series[series.length - 1].balance,
      },
    };
  }
}

module.exports = GetDailyCashFlowProjectionUseCase;
