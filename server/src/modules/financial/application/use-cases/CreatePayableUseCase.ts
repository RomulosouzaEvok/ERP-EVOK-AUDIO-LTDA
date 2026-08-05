import type { IFinancialRepository } from '../../domain/repositories/FinancialRepository';

const UseCase = require('../../../../shared/application/UseCase');
const AccountPayableEntity = require('../../domain/entities/AccountPayableEntity');

/** Dados de entrada de `CreatePayableUseCase.execute`. */
interface CreatePayableInput {
  description: string;
  amount: number | string;
  due_date: string | Date;
  category?: string;
  supplier_id?: number;
  purchase_id?: number;
  invoice_type?: 'nfe' | 'nfse';
  notes?: string;
}

/**
 * Cria uma conta a pagar, cobrindo o fluxo do endpoint
 * `POST /api/finance/payable`.
 *
 * A `AccountPayableEntity` valida apenas a FORMA da entrada (descrição,
 * valor > 0 e data de vencimento obrigatórios), exatamente como o
 * controller anterior `server/src/controllers/financeController.ts#createPayable`.
 */
class CreatePayableUseCase extends UseCase {
  /**
   * @param {import('../../domain/repositories/FinancialRepository')} financialRepository
   */
  financialRepository: IFinancialRepository;

  constructor(financialRepository: IFinancialRepository) {
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
   * @param {'nfe'|'nfse'} [input.invoice_type]
   * @param {string} [input.notes]
   * @returns {Promise<Object>} Conta a pagar criada.
   * @throws {import('../../../../errors').ValidationError} Se os dados de entrada forem inválidos.
   */
  async execute({ description, amount, due_date, category, supplier_id, purchase_id, invoice_type, notes }: CreatePayableInput) {
    const entity = new AccountPayableEntity({ description, amount, due_date, category, supplier_id, purchase_id, invoice_type, notes });

    return this.financialRepository.createPayable({
      description: entity.description,
      amount: entity.amount,
      due_date: entity.due_date,
      category: entity.category,
      supplier_id: entity.supplier_id,
      purchase_id: entity.purchase_id,
      invoice_type: entity.invoice_type,
      notes: entity.notes,
      status: 'pending'
    });
  }
}

module.exports = CreatePayableUseCase;


