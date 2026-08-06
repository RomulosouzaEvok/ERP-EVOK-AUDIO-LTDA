import type { Transaction } from 'sequelize';
import type { IReconciliationRepository } from '../../domain/repositories/ReconciliationRepository';

const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError, BusinessRuleError, ValidationError } = require('../../../../errors');
const { MATCH_TOLERANCE_CENTS } = require('../reconciliationRules');

/** Dados de entrada de `MatchEntryUseCase.execute`. */
interface MatchEntryInput {
  entryId: number | string;
  payableId?: number | null;
  receivableId?: number | null;
  userId: number;
  transaction: Transaction;
}

/**
 * Vincula um lançamento pendente do extrato a uma conta a pagar OU a
 * receber (XOR) já existente e, na mesma transação, dá baixa nela (paga ou
 * recebe), usando a data do lançamento do extrato como data de
 * pagamento/recebimento.
 *
 * A baixa é sempre integral: o valor do lançamento deve corresponder ao
 * saldo devedor/a receber da conta dentro da tolerância de centavos
 * {@link MATCH_TOLERANCE_CENTS} — não há conciliação parcial em v1 (se o
 * banco liquidou em mais de uma parcela, cada lançamento deve ser
 * conciliado com uma conta diferente, ex.: parcelas separadas).
 */
class MatchEntryUseCase extends UseCase {
  reconciliationRepository: IReconciliationRepository;

  constructor(reconciliationRepository: IReconciliationRepository) {
    super();
    this.reconciliationRepository = reconciliationRepository;
  }

  /**
   * @param {MatchEntryInput} input
   * @returns {Promise<{ entry: Object, account: Object, accountType: 'payable'|'receivable' }>}
   */
  async execute({ entryId, payableId, receivableId, userId, transaction }: MatchEntryInput) {
    if ((payableId && receivableId) || (!payableId && !receivableId)) {
      throw new ValidationError('Informe exatamente um de payable_id ou receivable_id.');
    }

    const entry = await this.reconciliationRepository.findEntryByIdForUpdate(entryId, transaction);
    if (!entry) throw new NotFoundError('Lançamento do extrato não encontrado.');

    if (entry.status !== 'pending') {
      const statusLabel = entry.status === 'matched' ? 'conciliado' : 'ignorado';
      throw new BusinessRuleError(`Este lançamento já foi ${statusLabel} e não pode ser conciliado novamente.`);
    }

    const entryAmount = Number(entry.amount);
    const entryCents = Math.round(Math.abs(entryAmount) * 100);

    if (payableId) {
      if (entryAmount >= 0) {
        throw new BusinessRuleError('Lançamento de entrada (crédito) não pode ser conciliado com uma conta a pagar (saída).');
      }

      const payable = await this.reconciliationRepository.findPayableByIdForUpdate(payableId, transaction);
      if (!payable) throw new NotFoundError('Conta a pagar não encontrada.');
      if (payable.status === 'paid') throw new BusinessRuleError('Esta conta a pagar já foi paga.');
      if (payable.status === 'canceled') throw new BusinessRuleError('Esta conta a pagar está cancelada.');

      const totalCents = Math.round(Number(payable.amount) * 100);
      const paidCents = Math.round(Number(payable.amount_paid ?? 0) * 100);
      const remainingCents = totalCents - paidCents;
      const diffCents = Math.abs(remainingCents - entryCents);

      if (diffCents > MATCH_TOLERANCE_CENTS) {
        throw new BusinessRuleError(
          `Valor do lançamento (R$ ${(entryCents / 100).toFixed(2)}) não confere com o saldo devedor da conta a pagar `
          + `(R$ ${(remainingCents / 100).toFixed(2)}). Diferença acima da tolerância de centavos permitida.`,
        );
      }

      const account = await this.reconciliationRepository.updatePayablePayment(payableId, {
        amount_paid: totalCents / 100,
        status: 'paid',
        payment_date: entry.entry_date,
        payment_method: payable.payment_method || 'conciliacao_bancaria',
      }, transaction);

      const updatedEntry = await this.reconciliationRepository.updateEntry(entryId, {
        status: 'matched',
        matched_payable_id: payableId,
        matched_receivable_id: null,
        matched_by: userId,
        matched_at: new Date(),
      }, transaction);

      return { entry: updatedEntry, account, accountType: 'payable' as const };
    }

    if (entryAmount <= 0) {
      throw new BusinessRuleError('Lançamento de saída (débito) não pode ser conciliado com uma conta a receber (entrada).');
    }

    const receivable = await this.reconciliationRepository.findReceivableByIdForUpdate(receivableId as number, transaction);
    if (!receivable) throw new NotFoundError('Conta a receber não encontrada.');
    if (receivable.status === 'paid') throw new BusinessRuleError('Esta conta a receber já foi recebida.');
    if (receivable.status === 'canceled') throw new BusinessRuleError('Esta conta a receber está cancelada.');

    const totalCents = Math.round(Number(receivable.amount) * 100);
    const paidCents = Math.round(Number(receivable.amount_paid ?? 0) * 100);
    const remainingCents = totalCents - paidCents;
    const diffCents = Math.abs(remainingCents - entryCents);

    if (diffCents > MATCH_TOLERANCE_CENTS) {
      throw new BusinessRuleError(
        `Valor do lançamento (R$ ${(entryCents / 100).toFixed(2)}) não confere com o saldo a receber da conta `
        + `(R$ ${(remainingCents / 100).toFixed(2)}). Diferença acima da tolerância de centavos permitida.`,
      );
    }

    const account = await this.reconciliationRepository.updateReceivablePayment(receivableId as number, {
      amount_paid: totalCents / 100,
      status: 'paid',
      payment_date: entry.entry_date,
      payment_method: receivable.payment_method || 'conciliacao_bancaria',
    }, transaction);

    const updatedEntry = await this.reconciliationRepository.updateEntry(entryId, {
      status: 'matched',
      matched_payable_id: null,
      matched_receivable_id: receivableId,
      matched_by: userId,
      matched_at: new Date(),
    }, transaction);

    return { entry: updatedEntry, account, accountType: 'receivable' as const };
  }
}

module.exports = MatchEntryUseCase;
