/**
 * Caso de uso: Balancete (relatório derivado, sem tabela própria), cobrindo
 * o fluxo do endpoint `GET /api/accounting/trial-balance?year=&month=`.
 *
 * Para cada conta "folha" (`accept_entries = true`) do Plano de Contas,
 * calcula on-the-fly a partir de `accounting_entry_items` (só lançamentos
 * `posted`): saldo anterior (líquido de tudo lançado antes do 1º dia do
 * mês/ano informado), débito do mês, crédito do mês e saldo atual
 * (`previous_balance + debit_movement - credit_movement`).
 *
 * Convenção de sinal: `balance = debit - credit` (positivo = natureza
 * devedora líquida, negativo = natureza credora líquida) — o mesmo cálculo
 * para todos os tipos de conta; a interpretação usual (ativo/despesa têm
 * saldo devedor "normal", passivo/PL/receita têm saldo credor "normal")
 * fica a cargo da camada de apresentação, não distorce o cálculo aqui.
 *
 * @module modules/accounting/application/use-cases/report/GetTrialBalanceUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { ValidationError } from '../../../../../errors';
import AccountingRepository from '../../../domain/repositories/AccountingRepository';

const { fromCents, toCents } = require('../../../../../shared/utils/money');

type GetTrialBalanceInput = { year: number; month: number };

class GetTrialBalanceUseCase extends UseCase<GetTrialBalanceInput, any> {
  private readonly accountingRepository: AccountingRepository;

  constructor(accountingRepository: AccountingRepository) {
    super();
    this.accountingRepository = accountingRepository;
  }

  /**
   * @throws {ValidationError} Se `month` estiver fora do intervalo 1–12.
   */
  async execute({ year, month }: GetTrialBalanceInput) {
    if (month < 1 || month > 12) {
      throw new ValidationError('month deve estar entre 1 e 12.');
    }

    const rows = await this.accountingRepository.getTrialBalanceRows(year, month);

    let totalPreviousCents = 0;
    let totalDebitCents = 0;
    let totalCreditCents = 0;
    let totalCurrentCents = 0;

    const accounts = rows.map((row) => {
      const previousDebitCents = toCents(Number(row.previous_debit) || 0);
      const previousCreditCents = toCents(Number(row.previous_credit) || 0);
      const debitMovementCents = toCents(Number(row.debit_movement) || 0);
      const creditMovementCents = toCents(Number(row.credit_movement) || 0);

      const previousBalanceCents = previousDebitCents - previousCreditCents;
      const currentBalanceCents = previousBalanceCents + debitMovementCents - creditMovementCents;

      totalPreviousCents += previousBalanceCents;
      totalDebitCents += debitMovementCents;
      totalCreditCents += creditMovementCents;
      totalCurrentCents += currentBalanceCents;

      return {
        account_id: row.account_id,
        code: row.code,
        name: row.name,
        account_type: row.account_type,
        previous_balance: fromCents(previousBalanceCents),
        debit_movement: fromCents(debitMovementCents),
        credit_movement: fromCents(creditMovementCents),
        current_balance: fromCents(currentBalanceCents),
      };
    });

    return {
      period: { year, month },
      accounts,
      totals: {
        previous_balance: fromCents(totalPreviousCents),
        debit_movement: fromCents(totalDebitCents),
        credit_movement: fromCents(totalCreditCents),
        current_balance: fromCents(totalCurrentCents),
      },
    };
  }
}

export = GetTrialBalanceUseCase;
