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

      if (amount !== undefined) {
        const parsedAmount = parseFloat(amount);
        if (parsedAmount <= 0) throw new ValidationError('Valor deve ser maior que zero');
        if (parsedAmount > parseFloat(account.amount)) {
          throw new ValidationError(`Valor (R$ ${parsedAmount}) excede o valor da conta (R$ ${account.amount})`);
        }
        account.amount = parsedAmount;
      }

      account.payment_date = payment_date || new Date();
      account.payment_method = payment_method || account.payment_method;
      account.status = 'paid';
      await account.save({ transaction });

      return { account, previousStatus };
    });
  }
}

module.exports = ReceivePaymentUseCase;
