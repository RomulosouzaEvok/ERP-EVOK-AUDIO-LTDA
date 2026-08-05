import type { IFinancialRepository } from '../../domain/repositories/FinancialRepository';

const UseCase = require('../../../../shared/application/UseCase');

/**
 * Calcula o fluxo de caixa (receitas e despesas por status) em um período,
 * cobrindo o fluxo do endpoint `GET /api/finance/cash-flow`.
 *
 * Reproduz exatamente os cálculos do controller anterior
 * `server/src/controllers/financeController.ts#cashFlow`: quando
 * `start_date`/`end_date` não são informados, usa o mês corrente.
 */
class GetCashFlowUseCase extends UseCase {
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
   * @param {string} [input.start_date]
   * @param {string} [input.end_date]
   * @returns {Promise<Object>} `{ period, summary, receivable_by_status, payable_by_status }`.
   */
  async execute({ start_date, end_date }: { start_date?: string; end_date?: string }) {
    const start = start_date ? new Date(start_date) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = end_date ? new Date(end_date) : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

    const receivable = await this.financialRepository.sumReceivableByStatus(start, end);
    const payable = await this.financialRepository.sumPayableByStatus(start, end);

    const pendingReceivable = receivable.filter(r => r.status === 'pending').reduce((a, r) => a + (Number(r.total) || 0), 0);
    const pendingPayable = payable.filter(p => p.status === 'pending').reduce((a, p) => a + (Number(p.total) || 0), 0);
    const totalReceivable = receivable.reduce((a, r) => a + (Number(r.total) || 0), 0);
    const totalPayable = payable.reduce((a, p) => a + (Number(p.total) || 0), 0);

    return {
      period: { start, end },
      summary: {
        total_receivable: totalReceivable,
        total_payable: totalPayable,
        pending_receivable: pendingReceivable,
        pending_payable: pendingPayable,
        projected_balance: pendingReceivable - pendingPayable,
        actual_balance: totalReceivable - totalPayable
      },
      receivable_by_status: receivable,
      payable_by_status: payable
    };
  }
}

module.exports = GetCashFlowUseCase;


