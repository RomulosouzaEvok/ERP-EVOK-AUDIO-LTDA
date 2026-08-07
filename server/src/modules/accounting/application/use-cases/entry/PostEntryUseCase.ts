import type { Transaction } from 'sequelize';

/**
 * Caso de uso: "postar" (contabilizar) um lançamento, cobrindo o fluxo do
 * endpoint dedicado `PATCH /api/accounting/entries/:id/post`
 * (`draft -> posted`).
 *
 * Esta é a validação central da partida dobrada: a soma de todos os
 * `debit` dos itens DEVE ser exatamente igual à soma de todos os `credit`
 * — senão rejeita com {@link BusinessRuleError} (HTTP 422) explicando a
 * diferença em reais. Um lançamento com 0 ou 1 item também é rejeitado
 * (partida dobrada exige no mínimo uma linha de débito e uma de crédito).
 *
 * A soma é feita em CENTAVOS (`toCents`) para evitar falso-negativo de
 * arredondamento de ponto flutuante (ex.: `0.1 + 0.2 !== 0.3`).
 *
 * @module modules/accounting/application/use-cases/entry/PostEntryUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError, BusinessRuleError } from '../../../../../errors';
import AccountingRepository from '../../../domain/repositories/AccountingRepository';

const { toCents, fromCents } = require('../../../../../shared/utils/money');

interface PostEntryInput {
  id: number;
  userId: number;
  transaction: Transaction;
}

class PostEntryUseCase extends UseCase<PostEntryInput, any> {
  private readonly accountingRepository: AccountingRepository;

  constructor(accountingRepository: AccountingRepository) {
    super();
    this.accountingRepository = accountingRepository;
  }

  /**
   * @throws {NotFoundError} Se o lançamento não existir.
   * @throws {BusinessRuleError} Se o lançamento não estiver `draft`, tiver menos de 2 itens, não tiver ao menos uma linha de débito e uma de crédito, ou se débito total ≠ crédito total.
   */
  async execute({ id, userId, transaction }: PostEntryInput) {
    const entry = await this.accountingRepository.findEntryByIdForUpdate(id, transaction);
    if (!entry) {
      throw new NotFoundError('Lançamento contábil não encontrado.');
    }
    if (entry.status !== 'draft') {
      throw new BusinessRuleError(`Lançamento ${entry.entry_number} está "${entry.status}" — apenas lançamentos em rascunho (draft) podem ser postados.`);
    }

    const items = await this.accountingRepository.findEntryItems(id, transaction);
    if (items.length < 2) {
      throw new BusinessRuleError(`Lançamento ${entry.entry_number} tem ${items.length} item(ns) — partida dobrada exige no mínimo uma linha de débito e uma de crédito (2 itens).`);
    }

    let totalDebitCents = 0;
    let totalCreditCents = 0;
    let hasDebitLine = false;
    let hasCreditLine = false;

    for (const item of items) {
      const debit = Number(item.debit) || 0;
      const credit = Number(item.credit) || 0;
      if (debit > 0) { hasDebitLine = true; totalDebitCents += toCents(debit); }
      if (credit > 0) { hasCreditLine = true; totalCreditCents += toCents(credit); }
    }

    if (!hasDebitLine || !hasCreditLine) {
      throw new BusinessRuleError(`Lançamento ${entry.entry_number} precisa de ao menos uma linha de débito E uma de crédito.`);
    }

    if (totalDebitCents !== totalCreditCents) {
      const diff = fromCents(Math.abs(totalDebitCents - totalCreditCents));
      const totalDebit = fromCents(totalDebitCents);
      const totalCredit = fromCents(totalCreditCents);
      throw new BusinessRuleError(
        `Lançamento ${entry.entry_number} não fecha: débito total R$ ${totalDebit.toFixed(2)} difere do crédito total R$ ${totalCredit.toFixed(2)} em R$ ${diff.toFixed(2)}. Ajuste os itens antes de postar.`,
        { total_debit: totalDebit, total_credit: totalCredit, difference: diff },
      );
    }

    await this.accountingRepository.updateEntry(id, {
      status: 'posted',
      approved_by: userId,
      approved_at: new Date(),
    }, transaction);

    return this.accountingRepository.findEntryById(id, transaction);
  }
}

export = PostEntryUseCase;
