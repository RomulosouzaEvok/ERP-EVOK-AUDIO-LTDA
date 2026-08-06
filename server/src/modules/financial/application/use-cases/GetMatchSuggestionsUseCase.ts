import type { IReconciliationRepository } from '../../domain/repositories/ReconciliationRepository';

const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError } = require('../../../../errors');
const { MATCH_TOLERANCE_CENTS, MATCH_DATE_WINDOW_DAYS } = require('../reconciliationRules');

/** Dados de entrada de `GetMatchSuggestionsUseCase.execute`. */
interface GetMatchSuggestionsInput {
  statementId: number | string;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Soma `days` dias a uma data `YYYY-MM-DD`, retornando `YYYY-MM-DD`. */
function addDays(dateOnly: string, days: number): string {
  const date = new Date(`${dateOnly}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Diferença absoluta em dias entre duas datas `YYYY-MM-DD`. */
function daysDiff(a: string, b: string): number {
  const dateA = new Date(`${a}T00:00:00Z`).getTime();
  const dateB = new Date(`${b}T00:00:00Z`).getTime();
  return Math.round(Math.abs(dateA - dateB) / MS_PER_DAY);
}

/**
 * Sugere candidatos automáticos de conciliação para cada lançamento
 * pendente de um extrato: para lançamentos de saída (`amount < 0`), busca
 * contas a pagar em aberto; para lançamentos de entrada (`amount > 0`),
 * contas a receber em aberto — mesmo valor absoluto (tolerância de
 * centavos {@link MATCH_TOLERANCE_CENTS}) e vencimento a até
 * {@link MATCH_DATE_WINDOW_DAYS} dias do lançamento, ranqueados pela
 * proximidade de data (mais próximo primeiro).
 *
 * NUNCA vincula automaticamente — apenas retorna candidatos para
 * confirmação humana via `POST /entries/:id/match`.
 */
class GetMatchSuggestionsUseCase extends UseCase {
  reconciliationRepository: IReconciliationRepository;

  constructor(reconciliationRepository: IReconciliationRepository) {
    super();
    this.reconciliationRepository = reconciliationRepository;
  }

  /**
   * @param {GetMatchSuggestionsInput} input
   * @returns {Promise<Array<{ entry: Object, suggestions: Array<Object> }>>}
   */
  async execute({ statementId }: GetMatchSuggestionsInput) {
    const statement = await this.reconciliationRepository.findStatementById(statementId);
    if (!statement) throw new NotFoundError('Extrato bancário não encontrado.');

    const entries = await this.reconciliationRepository.listPendingEntriesByStatement(statementId);

    const results = [];
    for (const entry of entries) {
      const amount = Number(entry.amount);
      if (amount === 0) {
        results.push({ entry, suggestions: [] });
        continue;
      }

      const dueDateFrom = addDays(entry.entry_date, -MATCH_DATE_WINDOW_DAYS);
      const dueDateTo = addDays(entry.entry_date, MATCH_DATE_WINDOW_DAYS);
      const entryCents = Math.round(Math.abs(amount) * 100);

      const candidates = amount < 0
        ? await this.reconciliationRepository.listOpenPayablesByDueDateRange(dueDateFrom, dueDateTo)
        : await this.reconciliationRepository.listOpenReceivablesByDueDateRange(dueDateFrom, dueDateTo);

      const suggestions = candidates
        .map((candidate: any) => {
          const totalCents = Math.round(Number(candidate.amount) * 100);
          const paidCents = Math.round(Number(candidate.amount_paid ?? 0) * 100);
          const remainingCents = totalCents - paidCents;
          const dateDiffDays = daysDiff(entry.entry_date, candidate.due_date);
          return {
            type: amount < 0 ? 'payable' : 'receivable',
            id: candidate.id,
            description: candidate.description ?? null,
            due_date: candidate.due_date,
            remaining_amount: remainingCents / 100,
            date_diff_days: dateDiffDays,
            amount_diff_cents: Math.abs(remainingCents - entryCents),
          };
        })
        .filter((candidate: any) => candidate.amount_diff_cents <= MATCH_TOLERANCE_CENTS)
        .sort((a: any, b: any) => a.date_diff_days - b.date_diff_days || a.amount_diff_cents - b.amount_diff_cents);

      results.push({ entry, suggestions });
    }

    return results;
  }
}

module.exports = GetMatchSuggestionsUseCase;
