const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError, ValidationError } = require('../../../../errors');

/**
 * Registra o pagamento (total ou parcial, via ajuste de `amount`) de uma
 * conta a pagar, cobrindo o fluxo do endpoint
 * `PUT /api/finance/payable/:id/pay`.
 *
 * Reproduz exatamente as validações do controller legado
 * `server/src/controllers/financeController.js#payPayable`.
 */
class PayPayableUseCase extends UseCase {
  /**
   * @param {import('../../domain/repositories/FinancialRepository')} financialRepository
   */
  constructor(financialRepository) {
    super();
    this.financialRepository = financialRepository;
  }

  /**
   * @param {Object} input
   * @param {number} input.id - Id da conta a pagar.
   * @param {string|Date} [input.payment_date]
   * @param {string} [input.payment_method]
   * @param {number|string} [input.amount] - Valor pago; se informado, deve ser > 0 e <= saldo da conta.
   * @returns {Promise<{ account: Object, previousStatus: string }>}
   * @throws {NotFoundError} Se a conta a pagar não existir.
   * @throws {ValidationError} Se a conta já estiver paga ou cancelada.
   * @throws {ValidationError} Se `amount` for <= 0 ou exceder o valor da conta.
   */
  async execute({ id, payment_date, payment_method, amount }) {
    const account = await this.financialRepository.findPayableById(id);
    if (!account) throw new NotFoundError('Conta a pagar não encontrada');
    if (account.status === 'paid') throw new ValidationError('Conta já foi paga');
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
    await account.save();

    return { account, previousStatus };
  }
}

module.exports = PayPayableUseCase;
