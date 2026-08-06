import type { IFinancialRepository } from '../../domain/repositories/FinancialRepository';
import type { ICostCenterRepository } from '../../domain/repositories/CostCenterRepository';

const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError } = require('../../../../errors');

/**
 * Atribui (ou remove, com `cost_center_id: null`) o centro de custo de uma
 * conta a pagar já existente, cobrindo o fluxo do endpoint
 * `PUT /api/finance/payable/:id/cost-center`.
 */
class UpdatePayableCostCenterUseCase extends UseCase {
  financialRepository: IFinancialRepository;
  costCenterRepository: ICostCenterRepository;

  /**
   * @param {import('../../domain/repositories/FinancialRepository')} financialRepository
   * @param {import('../../domain/repositories/CostCenterRepository')} costCenterRepository
   */
  constructor(financialRepository: IFinancialRepository, costCenterRepository: ICostCenterRepository) {
    super();
    this.financialRepository = financialRepository;
    this.costCenterRepository = costCenterRepository;
  }

  /**
   * @param {Object} input
   * @param {number} input.id - Id da conta a pagar.
   * @param {number|null} input.cost_center_id
   * @returns {Promise<Object>} Conta a pagar atualizada.
   * @throws {NotFoundError} Se a conta a pagar ou o centro de custo informado não existirem.
   */
  async execute({ id, cost_center_id }: { id: number | string; cost_center_id: number | null }) {
    const payable = await this.financialRepository.findPayableById(id);
    if (!payable) {
      throw new NotFoundError('Conta a pagar não encontrada.');
    }

    if (cost_center_id !== null) {
      const costCenter = await this.costCenterRepository.findCostCenterById(cost_center_id);
      if (!costCenter) {
        throw new NotFoundError('Centro de custo não encontrado.');
      }
    }

    return this.financialRepository.updatePayableCostCenter(id, cost_center_id);
  }
}

module.exports = UpdatePayableCostCenterUseCase;
