import type { Transaction } from 'sequelize';
import type { IFinancialRepository } from '../../domain/repositories/FinancialRepository';
import { randomUUID } from 'crypto';

const UseCase = require('../../../../shared/application/UseCase');
const { sequelize } = require('../../../../config/database');
const { NotFoundError, ValidationError, ConflictError } = require('../../../../errors');
const FinancialPaymentEvent = require('../../../../models/FinancialPaymentEvent');

/** Dados de entrada de `ReceivePaymentUseCase.execute`. */
interface ReceivePaymentInput {
  id: number;
  payment_date?: string | Date;
  payment_method?: string;
  amount?: number | string;
  operation_id?: string;
  createdBy?: number;
}

/**
 * Registra o recebimento de uma conta a receber em transacao com lock
 * pessimista para impedir baixa dupla em concorrencia.
 */
class ReceivePaymentUseCase extends UseCase {
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
   * @param {number} input.id
   * @param {string|Date} [input.payment_date]
   * @param {string} [input.payment_method]
   * @param {number|string} [input.amount]
   * @returns {Promise<{ account: Object, previousStatus: string }>}
   */
  async execute({ id, payment_date, payment_method, amount, operation_id, createdBy }: ReceivePaymentInput) {
    return sequelize.transaction(async (transaction: Transaction) => {
      const account = await this.financialRepository.findReceivableByIdForUpdate(id, transaction);
      if (!account) throw new NotFoundError('Conta a receber nao encontrada');
      if (account.status === 'paid') throw new ValidationError('Conta ja foi paga');
      if (account.status === 'canceled') throw new ValidationError('Conta cancelada');

      const previousStatus = account.status;
      const normalizedOperationId = operation_id?.trim() || randomUUID();

      // Trabalha sempre em centavos para evitar erro de ponto flutuante.
      const totalCents = Math.round(parseFloat(account.amount) * 100);
      const alreadyPaidCents = Math.round(parseFloat(account.amount_paid || 0) * 100);
      const remainingCents = totalCents - alreadyPaidCents;

      const paymentCents = amount !== undefined
        ? Math.round(parseFloat(String(amount)) * 100)
        : remainingCents;

      if (paymentCents <= 0) throw new ValidationError('Valor deve ser maior que zero');
      if (paymentCents > remainingCents) {
        throw new ValidationError(`Valor (R$ ${(paymentCents / 100).toFixed(2)}) excede o saldo devedor da conta (R$ ${(remainingCents / 100).toFixed(2)})`);
      }

      try {
        await FinancialPaymentEvent.create(
          {
            account_type: 'receivable',
            account_id: account.id,
            amount_cents: paymentCents,
            payment_date: payment_date || new Date(),
            payment_method: payment_method || account.payment_method,
            operation_id: normalizedOperationId,
            created_by: createdBy ?? null,
          },
          { transaction }
        );
      } catch (error: any) {
        if (error?.name === 'SequelizeUniqueConstraintError') {
          throw new ConflictError('Esta operação de pagamento já foi aplicada.');
        }
        throw error;
      }

      const newAmountPaidCents = alreadyPaidCents + paymentCents;

      // `amount` (valor total original) NUNCA e sobrescrito por um
      // recebimento parcial — apenas `amount_paid` acumula. Status so vira
      // 'paid' quando o saldo devedor chega a zero.
      account.amount_paid = newAmountPaidCents / 100;
      account.status = newAmountPaidCents >= totalCents ? 'paid' : 'partial';
      account.payment_date = payment_date || new Date();
      account.payment_method = payment_method || account.payment_method;
      await account.save({ transaction });

      return { account, previousStatus };
    });
  }
}

module.exports = ReceivePaymentUseCase;
