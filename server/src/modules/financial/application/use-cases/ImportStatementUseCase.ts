import type { Transaction } from 'sequelize';
import type { IReconciliationRepository } from '../../domain/repositories/ReconciliationRepository';
import type { ParsedOfxTransaction } from '../../infrastructure/ofx/parseOfx';

const UseCase = require('../../../../shared/application/UseCase');
const { parseOfx } = require('../../infrastructure/ofx/parseOfx');
const { BusinessRuleError } = require('../../../../errors');

/** Dados de entrada de `ImportStatementUseCase.execute`. */
interface ImportStatementInput {
  filename: string;
  buffer: Buffer;
  importedBy: number;
  transaction: Transaction;
}

/**
 * Importa um arquivo OFX: faz o parse (`parseOfx`), cria o `BankStatement`
 * e os `BankStatementEntry` (dedup por `fitid` contra QUALQUER importação
 * anterior — reimportar o mesmo arquivo não duplica lançamentos).
 */
class ImportStatementUseCase extends UseCase {
  reconciliationRepository: IReconciliationRepository;

  constructor(reconciliationRepository: IReconciliationRepository) {
    super();
    this.reconciliationRepository = reconciliationRepository;
  }

  /**
   * @param {ImportStatementInput} input
   * @returns {Promise<{ statement: Object, entries: Object[], entries_created: number, duplicates_skipped: number, total_in_file: number }>}
   */
  async execute({ filename, buffer, importedBy, transaction }: ImportStatementInput) {
    const parsed = parseOfx(buffer);

    if (parsed.transactions.length === 0) {
      throw new BusinessRuleError(
        'Nenhum lançamento (<STMTTRN>) foi encontrado no arquivo OFX enviado. Confirme que o período do extrato contém movimentações.',
      );
    }

    const statement = await this.reconciliationRepository.createStatement({
      filename,
      bank_name: parsed.bankName,
      account_number: parsed.accountNumber,
      period_start: parsed.periodStart,
      period_end: parsed.periodEnd,
      imported_by: importedBy,
    }, transaction);

    const fitids = parsed.transactions.map((t: ParsedOfxTransaction) => t.fitid);
    const existingFitids = await this.reconciliationRepository.findExistingFitids(fitids);

    const newTransactions = parsed.transactions.filter((t: ParsedOfxTransaction) => !existingFitids.has(t.fitid));
    const duplicatesSkipped = parsed.transactions.length - newTransactions.length;

    const entries = newTransactions.length > 0
      ? await this.reconciliationRepository.bulkCreateEntries(
        newTransactions.map((t: ParsedOfxTransaction) => ({
          statement_id: statement.id,
          entry_date: t.date,
          amount: t.amount,
          description: t.description,
          fitid: t.fitid,
          status: 'pending',
        })),
        transaction,
      )
      : [];

    return {
      statement,
      entries,
      entries_created: entries.length,
      duplicates_skipped: duplicatesSkipped,
      total_in_file: parsed.transactions.length,
    };
  }
}

module.exports = ImportStatementUseCase;
