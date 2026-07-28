const UseCase = require('../../../../shared/application/UseCase');
const AccountPayableEntity = require('../../domain/entities/AccountPayableEntity');

/**
 * Cria uma conta a pagar, cobrindo o fluxo do endpoint
 * `POST /api/finance/payable`.
 *
 * A `AccountPayableEntity` valida apenas a FORMA da entrada (descrição,
 * valor > 0 e data de vencimento obrigatórios), exatamente como o
 * controller legado `server/src/controllers/financeController.js#createPayable`.
 */
class CreatePayableUseCase extends UseCase {
  /**
   * @param {import('../../domain/repositories/FinancialRepository')} financialRepository
   */
  constructor(financialRepository) {
    super();
    this.financialRepository = financialRepository;
  }

  /**
   * @param {Object} input
   * @param {string} input.description
   * @param {number|string} input.amount
   * @param {string|Date} input.due_date
   * @param {string} [input.category]
   * @param {number} [input.supplier_id]
   * @param {number} [input.purchase_id]
   * @param {string} [input.notes]
   * @returns {Promise<Object>} Conta a pagar criada.
   * @throws {import('../../../../errors').ValidationError} Se os dados de entrada forem inválidos.
   */
  async execute({ description, amount, due_date, category, supplier_id, purchase_id, notes }) {
    const entity = new AccountPayableEntity({ description, amount, due_date, category, supplier_id, purchase_id, notes });

    return this.financialRepository.createPayable({
      description: entity.description,
      amount: entity.amount,
      due_date: entity.due_date,
      category: entity.category,
      supplier_id: entity.supplier_id,
      purchase_id: entity.purchase_id,
      notes: entity.notes,
      status: 'pending'
    });
  }
}

module.exports = CreatePayableUseCase;
