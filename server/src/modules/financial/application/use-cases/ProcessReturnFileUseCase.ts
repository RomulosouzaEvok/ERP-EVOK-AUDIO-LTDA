import type { Transaction } from 'sequelize';
import type { ICnabRepository } from '../../domain/repositories/CnabRepository';
import type { ParsedReturnOccurrence } from '../../infrastructure/cnab/parseReturnFile';

const UseCase = require('../../../../shared/application/UseCase');
const { parseReturnFile } = require('../../infrastructure/cnab/parseReturnFile');
const { SETTLEMENT_MOVEMENT_CODES, REJECTION_MOVEMENT_CODES } = require('../../infrastructure/cnab/layouts240');

/** Dados de entrada de `ProcessReturnFileUseCase.execute`. */
interface ProcessReturnFileInput {
  filename: string;
  buffer: Buffer;
  userId: number;
  transaction: Transaction;
}

/**
 * Processa um arquivo de RETORNO CNAB 240: para cada ocorrência (par
 * Segmento T+U), casa pelo `nosso_numero` com um `CnabRemittanceItem`
 * gerado por este sistema e, se o código de movimento for de liquidação
 * (`SETTLEMENT_MOVEMENT_CODES`), dá baixa na `AccountReceivable`
 * correspondente — tudo na mesma transação. Idempotente: reimportar o
 * mesmo arquivo (ou um arquivo com ocorrências repetidas) não duplica a
 * baixa (dedup por `(remittance_item_id, movement_code, occurrence_date,
 * amount_paid)`, ver `CnabRepository.findExistingOccurrence`).
 */
class ProcessReturnFileUseCase extends UseCase {
  cnabRepository: ICnabRepository;

  constructor(cnabRepository: ICnabRepository) {
    super();
    this.cnabRepository = cnabRepository;
  }

  /**
   * @param {ProcessReturnFileInput} input
   * @returns {Promise<{ returnFile: Object, occurrences_count: number, settled_count: number, duplicates_skipped: number, unmatched_count: number }>}
   */
  async execute({ filename, buffer, userId, transaction }: ProcessReturnFileInput) {
    const parsed = parseReturnFile(buffer);

    const returnFile = await this.cnabRepository.createReturnFile({
      filename,
      bank_code: parsed.bankCode,
      processed_by: userId,
    }, transaction);

    let settledCount = 0;
    let duplicatesSkipped = 0;
    let unmatchedCount = 0;

    for (const occurrence of parsed.occurrences as ParsedReturnOccurrence[]) {
      const remittanceItem = await this.cnabRepository.findRemittanceItemByNossoNumeroForUpdate(occurrence.nossoNumero, transaction);

      if (!remittanceItem) {
        unmatchedCount += 1;
        await this.cnabRepository.createReturnOccurrence({
          return_file_id: returnFile.id,
          remittance_item_id: null,
          nosso_numero: occurrence.nossoNumero,
          movement_code: occurrence.movementCode,
          movement_description: occurrence.movementDescription,
          amount_paid: occurrence.amountPaid,
          occurrence_date: occurrence.occurrenceDate,
          applied: false,
        }, transaction);
        continue;
      }

      const existing = await this.cnabRepository.findExistingOccurrence({
        remittance_item_id: remittanceItem.id,
        movement_code: occurrence.movementCode,
        occurrence_date: occurrence.occurrenceDate,
        amount_paid: occurrence.amountPaid,
      });
      if (existing) {
        duplicatesSkipped += 1;
        continue;
      }

      const isSettlement = SETTLEMENT_MOVEMENT_CODES.includes(occurrence.movementCode);
      const isRejection = REJECTION_MOVEMENT_CODES.includes(occurrence.movementCode);
      let applied = false;

      if (isSettlement && remittanceItem.status === 'pending') {
        const receivable = await this.cnabRepository.findReceivableByIdForUpdate(remittanceItem.receivable_id, transaction);
        if (receivable) {
          const totalCents = Math.round(Number(receivable.amount) * 100);
          const paidCents = Math.round(Number(receivable.amount_paid ?? 0) * 100);
          const incomingCents = Math.round(Number(occurrence.amountPaid || occurrence.nominalValue) * 100);
          const newPaidCents = paidCents + incomingCents;

          await this.cnabRepository.updateReceivablePayment(receivable.id, {
            amount_paid: newPaidCents / 100,
            status: newPaidCents >= totalCents ? 'paid' : 'partial',
            payment_date: occurrence.occurrenceDate || receivable.payment_date,
            payment_method: 'boleto',
          }, transaction);
        }

        await this.cnabRepository.updateRemittanceItem(remittanceItem.id, {
          status: 'settled',
          settled_at: new Date(),
        }, transaction);

        applied = true;
        settledCount += 1;
      } else if (isRejection && remittanceItem.status === 'pending') {
        await this.cnabRepository.updateRemittanceItem(remittanceItem.id, {
          status: 'error',
          error_description: occurrence.movementDescription || `Ocorrência ${occurrence.movementCode} rejeitada pelo banco.`,
        }, transaction);
      }

      await this.cnabRepository.createReturnOccurrence({
        return_file_id: returnFile.id,
        remittance_item_id: remittanceItem.id,
        nosso_numero: occurrence.nossoNumero,
        movement_code: occurrence.movementCode,
        movement_description: occurrence.movementDescription,
        amount_paid: occurrence.amountPaid,
        occurrence_date: occurrence.occurrenceDate,
        applied,
      }, transaction);
    }

    await this.cnabRepository.updateReturnFile(returnFile.id, {
      occurrences_count: parsed.occurrences.length,
      settled_count: settledCount,
      duplicates_skipped: duplicatesSkipped,
    }, transaction);

    return {
      returnFile,
      occurrences_count: parsed.occurrences.length,
      settled_count: settledCount,
      duplicates_skipped: duplicatesSkipped,
      unmatched_count: unmatchedCount,
    };
  }
}

module.exports = ProcessReturnFileUseCase;
