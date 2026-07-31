const UseCase = require('../../../../shared/application/UseCase');
const { sequelize } = require('../../../../config/database');
const { NotFoundError, ValidationError } = require('../../../../errors');

/**
 * Registra o recebimento de uma conta a receber em transacao com lock
 * pessimista para impedir baixa dupla em concorrencia.
 */
class ReceivePaymentUseCase extends UseCase {
  /**
   * @param {import('../../domain/repositories/FinancialRepository')} financialRepository
   */
  constructor(financialRepository) {
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
  async execute({ id, payment_date, payment_method, amount }) {
    return sequelize.transaction(async (transaction) => {
      const account = await this.financialRepository.findReceivableByIdForUpdate(id, transaction);
      if (!account) throw new NotFoundError('Conta a receber nao encontrada');
      if (account.status === 'paid') throw new ValidationError('Conta ja foi paga');
      if (account.status === 'canceled') throw new ValidationError('Conta cancelada');

      const previousStatus = account.status;

      // Trabalha sempre em centavos para evitar erro de ponto flutuante.
      const totalCents = Math.round(parseFloat(account.amount) * 100);
      const alreadyPaidCents = Math.round(parseFloat(account.amount_paid || 0) * 100);
      const remainingCents = totalCents - alreadyPaidCents;

      const paymentCents = amount !== undefined
        ? Math.round(parseFloat(amount) * 100)
        : remainingCents;

      if (paymentCents <= 0) throw new ValidationError('Valor deve ser maior que zero');
      if (paymentCents > remainingCents) {
        throw new ValidationError(`Valor (R$ ${(paymentCents / 100).toFixed(2)}) excede o saldo devedor da conta (R$ ${(remainingCents / 100).toFixed(2)})`);
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
